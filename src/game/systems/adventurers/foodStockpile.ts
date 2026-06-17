import type {GameData, StoryEntry} from "../../core/types";
import {getCarriedFoodNutritionTotal} from "./carriedFood";
import {getDailyFoodNutritionNeed} from "./dailyNeeds";
import {purchaseNutritionForAdventurer} from "./foodAllocation";

export function resolveOptionalFoodStockpile(gameData: GameData, nextDayEntries: StoryEntry[]): void {
  const tuning = gameData.dailyNeedsConfig.stockpileTuning;
  const eligibleAdventurers = gameData.adventurers.filter((adventurer) => {
    return adventurer.knownLevel !== "heard"
      && adventurer.currentQuestId === null
      && adventurer.carriedMoney >= tuning.moneyComfortThreshold;
  });

  eligibleAdventurers.forEach((adventurer) => {
    const carriedNutrition = getCarriedFoodNutritionTotal(gameData, adventurer);
    const reserveTarget = getDailyFoodNutritionNeed(gameData);
    if (carriedNutrition >= reserveTarget) {
      return;
    }

    const stockpileChance = clamp(
      tuning.baseChance
        + adventurer.personality.caution * tuning.cautionWeight
        + adventurer.personality.greed * tuning.greedWeight,
      0.05,
      0.75
    );
    if (Math.random() > stockpileChance) {
      return;
    }

    const unitsToBuy = Math.min(
      tuning.maxExtraUnitsPerDay,
      Math.max(1, reserveTarget - carriedNutrition)
    );
    purchaseNutritionForAdventurer(
      gameData,
      adventurer,
      unitsToBuy,
      nextDayEntries,
      "stock"
    );
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
