import type {GameData, Quest, QuestRisk, QuestTemplate} from "../../core/types";
import {
  getItemNutrition,
  getRecommendedRationTier,
  getRecommendedTrailRationQuantity,
  getTrailRationItemId
} from "../adventurers/dailyNeeds";
import {getEstimatedDaysForTemplate, getQuestPublishMode} from "./taskBoard";
import {getBuyPrice} from "../economy/marketPricing";
import {getMarketStockAmount} from "../economy/marketStock";
import {
  getStockTargetUnitCostRatioForProfile,
  resolveStockQuestProfile
} from "./stockQuestProfile";

export {
  calculateStockQuestDaysUncapped,
  getStockCargoValuePerDay,
  resolveStockQuestProfile
} from "./stockQuestProfile";

export function estimateQuestTrailRationCost(
  gameData: GameData,
  quest: Pick<Quest, "totalDays" | "risk" | "provisionRations">
): number {
  const recommendation = getRecommendedTrailRationQuantity(gameData, quest);
  const itemId = recommendation.itemId;
  const quantity = recommendation.quantity;
  const unitPrice = getBuyPrice(gameData, "item", itemId);
  let grossCost = quantity * unitPrice;

  const provision = quest.provisionRations;
  if (provision) {
    const provisionNutrition = provision.quantity * getItemNutrition(gameData, provision.itemId);
    const totalNutrition = quantity * recommendation.nutritionPerUnit;
    const coveredRatio = totalNutrition > 0 ? Math.min(1, provisionNutrition / totalNutrition) : 0;
    grossCost = Math.round(grossCost * (1 - coveredRatio));
  }

  return grossCost;
}

export function getMinimumLaborReward(
  gameData: GameData,
  template: QuestTemplate,
  quantity: number
): number {
  const totalDays = getEstimatedDaysForTemplate(gameData, template.id, quantity);
  const trailCost = estimateQuestTrailRationCost(gameData, {
    totalDays,
    risk: template.risk,
    provisionRations: null
  });
  const tuning = gameData.questEconomyConfig;
  return trailCost
    + tuning.trailCostMarginFlat
    + Math.ceil(trailCost * tuning.trailCostMarginRatio);
}

/** @deprecated Use getMinimumLaborReward */
export function getMinimumViableQuestReward(
  gameData: GameData,
  template: QuestTemplate,
  quantity: number
): number {
  return getMinimumLaborReward(gameData, template, quantity);
}

export function getMarketBuyTotal(gameData: GameData, resourceId: string, quantity: number): number {
  if (quantity <= 0) {
    return 0;
  }

  return quantity * getBuyPrice(gameData, "resource", resourceId);
}

export function getMarketStockAvailability(
  gameData: GameData,
  resourceId: string,
  quantity: number
): {available: boolean; stock: number} {
  const stock = getMarketStockAmount(gameData, "resource", resourceId);
  return {
    available: stock >= quantity,
    stock
  };
}

export function getQuestEffectiveUnitCost(reward: number, quantity: number): number {
  if (quantity <= 0) {
    return 0;
  }

  return reward / quantity;
}

export function getDefaultStockQuestQuantity(gameData: GameData, template: QuestTemplate | undefined): number {
  const profile = resolveStockQuestProfile(gameData, template);
  return profile?.defaultQuantity ?? 1;
}

/** 数量 → 目标有效单价 / 市场买入价；曲线控制点按模板货值锚点解析。 */
export function getStockTargetUnitCostRatio(
  gameData: GameData,
  template: QuestTemplate,
  quantity: number
): number {
  const profile = resolveStockQuestProfile(gameData, template);
  if (!profile) {
    return 1;
  }

  return getStockTargetUnitCostRatioForProfile(profile, quantity);
}

export function getQuestMarketSavingsPercent(reward: number, marketBuyTotal: number): number | null {
  if (marketBuyTotal <= 0) {
    return null;
  }

  return Math.round((1 - reward / marketBuyTotal) * 100);
}

export function getRecommendedQuestReward(
  gameData: GameData,
  template: QuestTemplate,
  quantity: number
): number {
  const minLaborReward = getMinimumLaborReward(gameData, template, quantity);

  if (getQuestPublishMode(template) !== "stock" || !template.resource) {
    return minLaborReward;
  }

  const buyPrice = getBuyPrice(gameData, "resource", template.resource);
  const targetUnitCostRatio = getStockTargetUnitCostRatio(gameData, template, quantity);
  const targetUnitCost = Math.floor(buyPrice * targetUnitCostRatio);
  const materialBudget = quantity * targetUnitCost;
  return Math.max(minLaborReward, materialBudget);
}

export function getQuestNetRewardMargin(gameData: GameData, quest: Quest): number {
  const trailCost = estimateQuestTrailRationBuyCost(gameData, quest);
  return quest.reward - trailCost;
}

function estimateQuestTrailRationBuyCost(
  gameData: GameData,
  quest: Pick<Quest, "totalDays" | "risk" | "provisionRations">
): number {
  const recommendation = getRecommendedTrailRationQuantity(gameData, quest);
  const itemId = recommendation.itemId;
  const quantity = recommendation.quantity;
  const buyPrice = getTrailRationBuyPrice(gameData, itemId);
  let grossCost = quantity * buyPrice;

  const provision = quest.provisionRations;
  if (provision) {
    const provisionNutrition = provision.quantity * getItemNutrition(gameData, provision.itemId);
    const totalNutrition = quantity * recommendation.nutritionPerUnit;
    const coveredRatio = totalNutrition > 0 ? Math.min(1, provisionNutrition / totalNutrition) : 0;
    grossCost = Math.round(grossCost * (1 - coveredRatio));
  }

  return grossCost;
}

export function getQuestNetMarginAcceptanceAdjustment(gameData: GameData, quest: Quest): number {
  if (gameData.questEconomyConfig.stockQuestLaborOnly && quest.resource) {
    // Stock 委托：接取只看劳务酬金能否覆盖路粮，不把原料当作可倒卖物资计入机会成本。
  }

  const netMargin = getQuestNetRewardMargin(gameData, quest);
  if (netMargin > 0) {
    return Math.min(0.35, netMargin * 0.03);
  }

  const tuning = gameData.questEconomyConfig;
  const penalty = Math.min(
    tuning.netMarginPenaltyCap,
    Math.abs(netMargin) * tuning.netMarginPenaltyPerCoin
  );
  return -penalty;
}

export function getProvisionAcceptanceBoostUnderPressure(
  gameData: GameData,
  quest: Quest,
  economicPressure: number
): number {
  if (!quest.provisionRations || economicPressure >= 0) {
    return 0;
  }

  const baseBoost = quest.provisionRations.quantity * 0.02;
  return baseBoost * (gameData.questEconomyConfig.provisionBrokeMultiplier - 1);
}

function getTrailRationBuyPrice(gameData: GameData, itemId: string): number {
  if (getMarketStockAmount(gameData, "item", itemId) <= 0) {
    return gameData.questEconomyConfig.unavailableMarketCostPenalty;
  }

  return getBuyPrice(gameData, "item", itemId);
}

export function getTrailRationBuyPriceForRisk(gameData: GameData, risk: QuestRisk): number {
  const itemId = getTrailRationItemId(gameData, getRecommendedRationTier(gameData, risk));
  return getTrailRationBuyPrice(gameData, itemId);
}
