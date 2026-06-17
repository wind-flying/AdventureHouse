#!/usr/bin/env node
import {readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";

const root = process.cwd();
const errors = [];

function readJson(relativePath) {
  const fullPath = join(root, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function loadJsonDir(relativeDir, key) {
  const dirPath = join(root, relativeDir);
  return readdirSync(dirPath)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      const data = JSON.parse(readFileSync(join(dirPath, name), "utf8"));
      return data[key] ?? [];
    });
}

const resources = readJson("config/resourcesType.json").resources ?? [];
const items = loadJsonDir("config/items", "items");
const establishment = readJson("config/establishment.json").establishment;
const marketListings = readJson("config/market.json").listings ?? [];
const marketPricing = readJson("config/market-pricing.json").pricing ?? {};
const questEconomy = readJson("config/quest-economy.json").questEconomy ?? {};
const questTemplates = loadJsonDir("config/quests", "questTemplates");
const craftingRecipes = readJson("config/crafting.json").recipes ?? [];
const dailyNeeds = readJson("config/daily-needs.json");

const ALLOWED_INGREDIENT_IDS = new Set(["salt", "wheat", "greens", "rice", "mutton"]);
const REMOVED_RESOURCE_IDS = ["wood", "stone", "treasure"];

const resourceIds = new Set();
resources.forEach((resource) => {
  if (resourceIds.has(resource.id)) {
    errors.push(`重复资源 id: ${resource.id}`);
  }
  resourceIds.add(resource.id);
  if (!ALLOWED_INGREDIENT_IDS.has(resource.id)) {
    errors.push(`资源 ${resource.id} 不在 v0.21 允许的 5 种原料列表中`);
  }
  if (typeof resource.basePrice !== "number" || resource.basePrice < 0) {
    errors.push(`资源 ${resource.id} 缺少有效 basePrice`);
  }
});

REMOVED_RESOURCE_IDS.forEach((resourceId) => {
  if (resourceIds.has(resourceId)) {
    errors.push(`应移除的资源仍在配置中: ${resourceId}`);
  }
});

const itemIds = new Set();
items.forEach((item) => {
  if (itemIds.has(item.id)) {
    errors.push(`重复物品 id: ${item.id}`);
  }
  itemIds.add(item.id);
  if (typeof item.giftValue !== "number" || item.giftValue < 0) {
    errors.push(`物品 ${item.id} 缺少有效 giftValue`);
  }
  if (item.basePrice !== undefined && (typeof item.basePrice !== "number" || item.basePrice < 0)) {
    errors.push(`物品 ${item.id} 的 basePrice 无效`);
  }
  const consumableModel = item.consumableModel ?? (item.category === "food" ? "food" : "standard");
  if (consumableModel === "food") {
    if (item.shelfLifeQuests !== undefined) {
      errors.push(`食物 ${item.id} 不应设置 shelfLifeQuests`);
    }
    item.effects.forEach((effect, index) => {
      if (effect.duration === "days" && (!Number.isInteger(effect.durationDays) || (effect.durationDays ?? 0) <= 0)) {
        errors.push(`食物 ${item.id} 的效果 #${index + 1} 缺少有效 durationDays`);
      }
    });
  } else if (!Number.isInteger(item.shelfLifeQuests) || (item.shelfLifeQuests ?? 0) <= 0) {
    errors.push(`非食物物品 ${item.id} 缺少有效 shelfLifeQuests`);
  }
});

marketListings.forEach((listing) => {
  if (listing.kind === "resource" && !resourceIds.has(listing.refId)) {
    errors.push(`市场条目 ${listing.id} 引用了未知资源 ${listing.refId}`);
  }
  if (listing.kind === "item" && !itemIds.has(listing.refId)) {
    errors.push(`市场条目 ${listing.id} 引用了未知物品 ${listing.refId}`);
  }
});

craftingRecipes.forEach((recipe) => {
  if (!itemIds.has(recipe.outputItemId)) {
    errors.push(`制作配方 ${recipe.id} 引用了未知产出物品 ${recipe.outputItemId}`);
  }
  recipe.inputs.forEach((input) => {
    if (input.kind === "resource" && !resourceIds.has(input.refId)) {
      errors.push(`制作配方 ${recipe.id} 引用了未知资源 ${input.refId}`);
    }
    if (input.kind === "item" && !itemIds.has(input.refId)) {
      errors.push(`制作配方 ${recipe.id} 引用了未知物品 ${input.refId}`);
    }
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      errors.push(`制作配方 ${recipe.id} 的输入数量无效`);
    }
  });
});

if (!establishment?.sellableItemCategories?.length) {
  errors.push("establishment.sellableItemCategories 不能为空");
}

const dailyNutritionMilli = dailyNeeds?.categories?.food?.dailyNutritionMilli;
if (!Number.isInteger(dailyNutritionMilli) || dailyNutritionMilli <= 0) {
  errors.push("daily-needs.categories.food.dailyNutritionMilli 无效");
}

Object.entries(dailyNeeds?.ingredientNutritionMilli ?? {}).forEach(([resourceId, nutritionMilli]) => {
  if (!ALLOWED_INGREDIENT_IDS.has(resourceId)) {
    errors.push(`daily-needs.ingredientNutritionMilli 引用了未知原料 ${resourceId}`);
  }
  if (!Number.isInteger(nutritionMilli) || nutritionMilli < 0) {
    errors.push(`daily-needs.ingredientNutritionMilli.${resourceId} 无效`);
  }
});

Object.entries(dailyNeeds?.nutritionByRef ?? {}).forEach(([refKey, nutrition]) => {
  if (!Number.isInteger(nutrition) || nutrition <= 0) {
    errors.push(`daily-needs.nutritionByRef.${refKey} 无效`);
  }
  const [kind, refId] = refKey.split(":");
  if (kind === "resource" && !resourceIds.has(refId)) {
    errors.push(`daily-needs 引用了未知资源 ${refId}`);
  }
  if (kind === "item" && !itemIds.has(refId)) {
    errors.push(`daily-needs 引用了未知物品 ${refId}`);
  }
});

Object.entries(dailyNeeds?.trailRations ?? {}).forEach(([tier, itemId]) => {
  if (!itemIds.has(itemId)) {
    errors.push(`daily-needs.trailRations.${tier} 引用了未知物品 ${itemId}`);
  }
  const nutritionKey = `item:${itemId}`;
  const nutrition = dailyNeeds?.nutritionByRef?.[nutritionKey];
  if (!Number.isInteger(nutrition) || nutrition < 1) {
    errors.push(`干粮 ${itemId} 在 nutritionByRef 中缺少有效营养值`);
  }
});

function getItemAnchorPrice(itemId) {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return 1;
  }

  if (typeof item.basePrice === "number" && item.basePrice >= 0) {
    return item.basePrice;
  }

  return item.giftValue ?? 1;
}

function getBuyPrice(anchorPrice) {
  return Math.max(1, Math.ceil(anchorPrice * (marketPricing.buyMultiplier ?? 1.3)));
}

const DIFFICULTY_OFFSET = {easy: 0, medium: 1, hard: 2};
const BASE_DURATION_DAYS = 1;
const LEGACY_QUANTITY_DURATION_STEP = 2;

function getPublishMode(template) {
  if (template.publishMode) {
    return template.publishMode;
  }

  return template.nature === "investigation" || template.nature === "mysterious" ? "intel" : "stock";
}

function getEstimatedDays(template, quantity, profile) {
  if (template.timingMode === "fixed") {
    return Math.max(1, template.fixedDurationDays ?? 1);
  }

  if (getPublishMode(template) === "stock") {
    if (!profile) {
      return 1;
    }

    const qty = Math.max(1, quantity);
    const anchor = Math.max(1, profile.anchorQuantity);
    let uncappedDays = 1;
    if (qty > anchor) {
      const excess = qty - anchor;
      const extraDays = Math.ceil(Math.pow(excess / anchor, profile.daysGamma));
      uncappedDays = 1 + extraDays;
    }

    return Math.min(questEconomy.maxDaysPerStockQuest ?? 3, uncappedDays);
  }

  const difficultyOffset = DIFFICULTY_OFFSET[template.difficulty] ?? 0;
  const baseDays = BASE_DURATION_DAYS + difficultyOffset;
  const totalDays = baseDays + Math.floor((quantity - 1) / LEGACY_QUANTITY_DURATION_STEP);
  return totalDays;
}

function lerp(start, end, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return start + (end - start) * clamped;
}

function cargoValueToQuantity(cargoValue, buyPrice, mod) {
  if (buyPrice <= 0) {
    return 1;
  }

  return Math.max(1, Math.round((cargoValue / buyPrice) * mod));
}

function resolveStockQuestProfile(template) {
  if (getPublishMode(template) !== "stock" || !template.resource) {
    return null;
  }

  const curve = questEconomy.stockQuestCargoCurve ?? {};
  const resource = resources.find((entry) => entry.id === template.resource);
  const buyPrice = getBuyPrice(resource?.basePrice ?? 1);
  const difficulty = curve.difficultyMod?.[template.difficulty] ?? 1;
  const risk = curve.riskMod?.[template.risk] ?? 1;
  const mod = difficulty * risk * (template.stockCargoBias ?? 1) * (resource?.stockCargoBias ?? 1);
  const anchorQuantity = cargoValueToQuantity(curve.referenceCargoValue ?? 20, buyPrice, mod);
  const sweetSpotQuantity = Math.max(
    anchorQuantity,
    cargoValueToQuantity(curve.sweetSpotCargoValue ?? 48, buyPrice, mod)
  );
  const breakEvenQuantity = Math.max(
    sweetSpotQuantity,
    cargoValueToQuantity(curve.breakEvenCargoValue ?? 72, buyPrice, mod)
  );
  const highQuantityReference = Math.max(
    breakEvenQuantity + 1,
    cargoValueToQuantity(curve.highCargoReference ?? 100, buyPrice, mod)
  );

  return {
    anchorQuantity,
    sweetSpotQuantity,
    breakEvenQuantity,
    highQuantityReference,
    daysGamma: curve.daysGamma ?? 1.25,
    buyPrice,
    anchorUnitCostRatio: curve.anchorUnitCostRatio ?? 0.94,
    minUnitCostRatio: curve.minUnitCostRatio ?? 0.86,
    lowQuantityMaxRatio: curve.lowQuantityMaxRatio ?? 1.12,
    highQuantityMaxRatio: curve.highQuantityMaxRatio ?? 1.1
  };
}

function getStockTargetUnitCostRatio(profile, quantity) {
  const qty = Math.max(1, quantity);
  const anchor = Math.max(1, profile.anchorQuantity);
  const sweet = Math.max(anchor, profile.sweetSpotQuantity);
  const breakEven = Math.max(sweet, profile.breakEvenQuantity);
  const highRef = Math.max(breakEven + 1, profile.highQuantityReference);

  if (qty <= anchor) {
    if (anchor <= 1) {
      return profile.anchorUnitCostRatio;
    }

    return lerp(
      profile.lowQuantityMaxRatio,
      profile.anchorUnitCostRatio,
      (qty - 1) / (anchor - 1)
    );
  }

  if (qty <= sweet) {
    return lerp(profile.anchorUnitCostRatio, profile.minUnitCostRatio, (qty - anchor) / (sweet - anchor));
  }

  if (qty <= breakEven) {
    return lerp(profile.minUnitCostRatio, 1, (qty - sweet) / (breakEven - sweet));
  }

  return lerp(
    profile.highQuantityMaxRatio,
    1,
    Math.min(1, (highRef - qty) / (highRef - breakEven))
  );
}

function estimateRecommendedQuestReward(template, quantity, profile) {
  const minLabor = estimateMinimumLaborReward(template, quantity, profile);
  const ratio = getStockTargetUnitCostRatio(profile, quantity);
  const materialBudget = quantity * Math.floor(profile.buyPrice * ratio);
  return Math.max(minLabor, materialBudget);
}

function estimateMinimumLaborReward(template, quantity, profile) {
  const tier = dailyNeeds?.riskToRationTier?.[template.risk] ?? "low";
  const itemId = dailyNeeds?.trailRations?.[tier];
  const nutritionMilli = dailyNeeds?.nutritionByRef?.[`item:${itemId}`] ?? 0;
  const nutritionPerUnit = nutritionMilli / 1000;
  const dailyNeed = (dailyNutritionMilli ?? 2000) / 1000;
  const totalDays = getEstimatedDays(template, quantity, profile);
  const rationQuantity = nutritionPerUnit > 0 ? Math.ceil((totalDays * dailyNeed) / nutritionPerUnit) : 0;
  const trailCost = rationQuantity * getBuyPrice(getItemAnchorPrice(itemId));
  return trailCost
    + (questEconomy.trailCostMarginFlat ?? 0)
    + Math.ceil(trailCost * (questEconomy.trailCostMarginRatio ?? 0));
}

questTemplates.forEach((template) => {
  if (template.publishMode === "intel" || !template.resource) {
    return;
  }

  const profile = resolveStockQuestProfile(template);
  if (!profile) {
    return;
  }

  const minViable = estimateMinimumLaborReward(template, 1, profile);
  if (template.minReward < minViable) {
    errors.push(`任务模板 ${template.id} 的 minReward(${template.minReward}) 低于预估最低劳务酬金 ${minViable}`);
  }
});

const REQUIRED_QUEST_ECONOMY_KEYS = [
  "trailCostMarginFlat",
  "trailCostMarginRatio",
  "maxDaysPerStockQuest",
  "stockQuestLaborOnly",
  "stockQuestCargoCurve"
];
REQUIRED_QUEST_ECONOMY_KEYS.forEach((key) => {
  if (questEconomy[key] === undefined) {
    errors.push(`quest-economy.json 缺少字段 ${key}`);
  }
});

const curve = questEconomy.stockQuestCargoCurve ?? {};
const REQUIRED_CURVE_KEYS = [
  "referenceCargoValue",
  "sweetSpotCargoValue",
  "breakEvenCargoValue",
  "highCargoReference",
  "anchorUnitCostRatio",
  "minUnitCostRatio",
  "lowQuantityMaxRatio",
  "highQuantityMaxRatio",
  "daysGamma",
  "difficultyMod",
  "riskMod"
];
REQUIRED_CURVE_KEYS.forEach((key) => {
  if (curve[key] === undefined) {
    errors.push(`quest-economy.stockQuestCargoCurve 缺少字段 ${key}`);
  }
});

const anchorProfilesByTemplate = new Map();
questTemplates.forEach((template) => {
  if (getPublishMode(template) !== "stock" || !template.resource) {
    return;
  }

  const profile = resolveStockQuestProfile(template);
  if (!profile) {
    return;
  }

  anchorProfilesByTemplate.set(template.id, profile);
  const anchorQuantity = profile.anchorQuantity;
  const daysAtAnchor = getEstimatedDays(template, anchorQuantity, profile);
  if (daysAtAnchor !== 1) {
    errors.push(
      `任务模板 ${template.id} 在锚点数量 ${anchorQuantity} 时预估天数为 ${daysAtAnchor}，应为 1 天`
    );
  }

  const anchorReward = estimateRecommendedQuestReward(template, anchorQuantity, profile);
  const anchorMarketTotal = profile.buyPrice * anchorQuantity;
  if (anchorReward >= anchorMarketTotal) {
    errors.push(
      `任务模板 ${template.id} 在数量 ${anchorQuantity} 时推荐酬金 ${anchorReward} 不低于市场直购 ${anchorMarketTotal}`
    );
  }

  const lowQuantity = 1;
  const lowReward = estimateRecommendedQuestReward(template, lowQuantity, profile);
  const lowMarketTotal = profile.buyPrice * lowQuantity;
  if (lowReward < lowMarketTotal) {
    errors.push(
      `任务模板 ${template.id} 在数量 ${lowQuantity} 时推荐酬金 ${lowReward} 仍低于市场直购 ${lowMarketTotal}，小批量应不如市场`
    );
  }

  const highQuantity = profile.highQuantityReference;
  const highReward = estimateRecommendedQuestReward(template, highQuantity, profile);
  const highMarketTotal = profile.buyPrice * highQuantity;
  if (highReward < highMarketTotal) {
    errors.push(
      `任务模板 ${template.id} 在数量 ${highQuantity} 时推荐酬金 ${highReward} 仍低于市场直购 ${highMarketTotal}，超大批量应不如市场`
    );
  }
});

const anchorQuantities = [...anchorProfilesByTemplate.values()].map((profile) => profile.anchorQuantity);
if (anchorQuantities.length >= 2 && new Set(anchorQuantities).size < anchorQuantities.length) {
  // 允许部分相同（同价物资），但不应全部相同
}

if (anchorQuantities.length >= 2 && anchorQuantities.every((quantity) => quantity === anchorQuantities[0])) {
  const distinctPrices = new Set(
    [...anchorProfilesByTemplate.values()].map((profile) => profile.buyPrice)
  );
  if (distinctPrices.size >= 2) {
    errors.push("不同单价的 stock 模板应解析出不同的锚点数量，当前全部相同");
  }
}

if (errors.length > 0) {
  console.error("配置校验失败:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("配置校验通过。");
