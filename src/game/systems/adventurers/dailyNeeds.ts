import dailyNeedsData from "../../../../config/daily-needs.json";
import type {DailyNeedsConfig, GameData, Quest, QuestRisk, TrailRationTier} from "../../core/types";
import {isFoodItem} from "../items/itemModel";
import {getItemDefinition} from "../economy/pricing";

export const dailyNeedsConfig = dailyNeedsData as DailyNeedsConfig;

const NUTRITION_MILLI_SCALE = 1000;

export function getDailyFoodNutritionNeed(gameData: GameData): number {
  return gameData.dailyNeedsConfig.categories.food.dailyNutritionMilli / NUTRITION_MILLI_SCALE;
}

export function getDailyFoodNutritionNeedMilli(gameData: GameData): number {
  return gameData.dailyNeedsConfig.categories.food.dailyNutritionMilli;
}

export function getNutritionRefKey(kind: "resource" | "item", refId: string): string {
  return `${kind}:${refId}`;
}

export function getNutritionMilliForRef(gameData: GameData, kind: "resource" | "item", refId: string): number {
  if (kind === "resource") {
    return gameData.dailyNeedsConfig.ingredientNutritionMilli[refId] ?? 0;
  }

  const configured = gameData.dailyNeedsConfig.nutritionByRef[getNutritionRefKey(kind, refId)];
  return typeof configured === "number" && configured > 0 ? configured : 0;
}

export function getNutritionForRef(gameData: GameData, kind: "resource" | "item", refId: string): number {
  return getNutritionMilliForRef(gameData, kind, refId) / NUTRITION_MILLI_SCALE;
}

export function getItemNutrition(gameData: GameData, itemId: string): number {
  return getNutritionForRef(gameData, "item", itemId);
}

export function isNutritionFoodItem(gameData: GameData, itemId: string): boolean {
  const item = getItemDefinition(gameData, itemId);
  if (!item) {
    return false;
  }

  return isFoodItem(item) && getItemNutrition(gameData, itemId) > 0;
}

export function isNutritionIngredient(gameData: GameData, resourceId: string): boolean {
  return getNutritionMilliForRef(gameData, "resource", resourceId) > 0;
}

export function getTrailRationItemId(gameData: GameData, tier: TrailRationTier): string {
  return gameData.dailyNeedsConfig.trailRations[tier];
}

export function getRecommendedRationTier(gameData: GameData, risk: QuestRisk): TrailRationTier {
  return gameData.dailyNeedsConfig.riskToRationTier[risk] ?? "low";
}

export function getQuestTrailNutritionNeed(gameData: GameData, quest: Pick<Quest, "totalDays">): number {
  return quest.totalDays * getDailyFoodNutritionNeed(gameData);
}

export function getRecommendedTrailRationQuantity(
  gameData: GameData,
  quest: Pick<Quest, "totalDays" | "risk">
): {tier: TrailRationTier; itemId: string; quantity: number; nutritionPerUnit: number} {
  const tier = getRecommendedRationTier(gameData, quest.risk);
  const itemId = getTrailRationItemId(gameData, tier);
  const nutritionPerUnit = getItemNutrition(gameData, itemId);
  const totalNeed = getQuestTrailNutritionNeed(gameData, quest);
  const quantity = nutritionPerUnit > 0 ? Math.ceil(totalNeed / nutritionPerUnit) : 0;
  return {tier, itemId, quantity, nutritionPerUnit};
}

export function getProvisionAcceptanceBoost(gameData: GameData, quest: Quest): number {
  const provision = quest.provisionRations;
  if (!provision) {
    return 0;
  }

  const tuning = gameData.dailyNeedsConfig.provisionAcceptanceBoost;
  const nutritionTotal = provision.quantity * getItemNutrition(gameData, provision.itemId);
  const tierMultiplier = tuning.tierMultiplier[provision.tier] ?? 1;
  const rawBoost = nutritionTotal * tuning.perNutritionPoint * tierMultiplier;
  return Math.min(tuning.cap, rawBoost);
}
