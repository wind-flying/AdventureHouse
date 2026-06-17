import type {Difficulty, GameData, QuestRisk, QuestTemplate, StockQuestCargoCurve} from "../../core/types";
import {getBuyPrice} from "../economy/marketPricing";

function getQuestPublishMode(template: QuestTemplate): "stock" | "intel" {
  return template.publishMode
    ?? (template.nature === "investigation" || template.nature === "mysterious" ? "intel" : "stock");
}

export interface ResolvedStockQuestProfile {
  anchorQuantity: number;
  sweetSpotQuantity: number;
  breakEvenQuantity: number;
  highQuantityReference: number;
  defaultQuantity: number;
  daysGamma: number;
  buyPrice: number;
  anchorUnitCostRatio: number;
  minUnitCostRatio: number;
  lowQuantityMaxRatio: number;
  highQuantityMaxRatio: number;
}

function lerp(start: number, end: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return start + (end - start) * clamped;
}

function cargoValueToQuantity(cargoValue: number, buyPrice: number, mod: number): number {
  if (buyPrice <= 0) {
    return 1;
  }

  return Math.max(1, Math.round((cargoValue / buyPrice) * mod));
}

function getTemplateCargoMod(
  gameData: GameData,
  template: QuestTemplate,
  curve: StockQuestCargoCurve
): number {
  const difficulty = curve.difficultyMod[template.difficulty as Difficulty] ?? 1;
  const risk = curve.riskMod[template.risk as QuestRisk] ?? 1;
  const templateBias = template.stockCargoBias ?? 1;
  const resource = gameData.resources.find((entry) => entry.id === template.resource);
  const resourceBias = resource?.stockCargoBias ?? 1;
  return difficulty * risk * templateBias * resourceBias;
}

export function resolveStockQuestProfile(
  gameData: GameData,
  template: QuestTemplate | undefined
): ResolvedStockQuestProfile | null {
  if (!template?.resource || getQuestPublishMode(template) !== "stock") {
    return null;
  }

  const curve = gameData.questEconomyConfig.stockQuestCargoCurve;
  const buyPrice = getBuyPrice(gameData, "resource", template.resource);
  const mod = getTemplateCargoMod(gameData, template, curve);
  const anchorQuantity = cargoValueToQuantity(curve.referenceCargoValue, buyPrice, mod);
  const sweetSpotQuantity = Math.max(
    anchorQuantity,
    cargoValueToQuantity(curve.sweetSpotCargoValue, buyPrice, mod)
  );
  const breakEvenQuantity = Math.max(
    sweetSpotQuantity,
    cargoValueToQuantity(curve.breakEvenCargoValue, buyPrice, mod)
  );
  const highQuantityReference = Math.max(
    breakEvenQuantity + 1,
    cargoValueToQuantity(curve.highCargoReference, buyPrice, mod)
  );

  return {
    anchorQuantity,
    sweetSpotQuantity,
    breakEvenQuantity,
    highQuantityReference,
    defaultQuantity: anchorQuantity,
    daysGamma: curve.daysGamma,
    buyPrice,
    anchorUnitCostRatio: curve.anchorUnitCostRatio,
    minUnitCostRatio: curve.minUnitCostRatio,
    lowQuantityMaxRatio: curve.lowQuantityMaxRatio,
    highQuantityMaxRatio: curve.highQuantityMaxRatio
  };
}

export function calculateStockQuestDaysUncapped(profile: ResolvedStockQuestProfile, quantity: number): number {
  const qty = Math.max(1, quantity);
  const anchor = Math.max(1, profile.anchorQuantity);

  if (qty <= anchor) {
    return 1;
  }

  const excess = qty - anchor;
  const extraDays = Math.ceil(Math.pow(excess / anchor, profile.daysGamma));
  return 1 + extraDays;
}

export function getStockCargoValuePerDay(quantity: number, buyPrice: number, days: number): number {
  if (days <= 0 || buyPrice <= 0) {
    return 0;
  }

  return Math.round((quantity * buyPrice) / days);
}

/** 数量 → 目标有效单价 / 市场买入价；曲线控制点来自该模板的货值锚点。 */
export function getStockTargetUnitCostRatioForProfile(
  profile: ResolvedStockQuestProfile,
  quantity: number
): number {
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
