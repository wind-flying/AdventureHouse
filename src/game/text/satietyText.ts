import type {GameData} from "../core/types";
import {getDailyFoodNutritionNeed, getNutritionForRef} from "../systems/adventurers/dailyNeeds";

const DAY_FRACTIONS: Array<{value: number; label: string}> = [
  {value: 0.5, label: "半天"},
  {value: 1, label: "一天"},
  {value: 1.5, label: "一天半"},
  {value: 2, label: "两天"},
  {value: 2.5, label: "两天半"},
  {value: 3, label: "三天"}
];

export function formatSatietyDays(dayFraction: number): string {
  if (dayFraction <= 0) {
    return "";
  }

  const roundedHalf = Math.round(dayFraction * 2) / 2;
  const exactMatch = DAY_FRACTIONS.find((entry) => Math.abs(entry.value - roundedHalf) < 0.001);
  if (exactMatch) {
    return exactMatch.label;
  }

  if (roundedHalf < 1) {
    return "不到一天";
  }

  const wholeDays = Math.floor(roundedHalf);
  const hasHalf = Math.abs(roundedHalf - wholeDays - 0.5) < 0.001;
  if (hasHalf) {
    return `${wholeDays}天半`;
  }

  return `${wholeDays}天`;
}

export function getSatietyDescription(
  nutrition: number,
  dailyNutrition = 2,
  surplusHintThreshold = 0.15
): string | null {
  if (nutrition <= 0 || dailyNutrition <= 0) {
    return null;
  }

  const dayRatio = nutrition / dailyNutrition;
  if (dayRatio >= 1) {
    return `一份够吃${formatSatietyDays(dayRatio)}`;
  }

  const count = Math.ceil(dailyNutrition / nutrition);
  const totalNutrition = count * nutrition;
  const surplus = totalNutrition - dailyNutrition;
  if (surplus > 0 && surplus <= dailyNutrition * surplusHintThreshold) {
    return `一天吃${count}个还剩一点`;
  }

  return `一天要吃${count}个才饱`;
}

export function getStackSatietySummary(
  nutritionPerUnit: number,
  quantity: number,
  dailyNutrition = 2,
  surplusHintThreshold = 0.15
): string | null {
  if (quantity <= 0 || nutritionPerUnit <= 0) {
    return null;
  }

  const totalNutrition = nutritionPerUnit * quantity;
  const dayRatio = totalNutrition / dailyNutrition;
  if (dayRatio >= 1) {
    return `约够吃${formatSatietyDays(dayRatio)}`;
  }

  const single = getSatietyDescription(nutritionPerUnit, dailyNutrition, surplusHintThreshold);
  return single ? `${quantity}份，${single}` : null;
}

export function getSatietyDescriptionForRef(
  gameData: GameData,
  kind: "resource" | "item",
  refId: string
): string | null {
  const nutrition = getNutritionForRef(gameData, kind, refId);
  if (nutrition <= 0) {
    return null;
  }

  return getSatietyDescription(
    nutrition,
    getDailyFoodNutritionNeed(gameData),
    gameData.marketPricing.surplusHintThreshold
  );
}

export function getStackSatietySummaryForRef(
  gameData: GameData,
  kind: "resource" | "item",
  refId: string,
  quantity: number
): string | null {
  const nutrition = getNutritionForRef(gameData, kind, refId);
  if (nutrition <= 0) {
    return null;
  }

  return getStackSatietySummary(
    nutrition,
    quantity,
    getDailyFoodNutritionNeed(gameData),
    gameData.marketPricing.surplusHintThreshold
  );
}
