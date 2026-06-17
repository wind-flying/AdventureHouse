import type {Adventurer, GameData, ItemDefinition} from "../../core/types";
import {applyFoodItemBuffs} from "./adventurerBuffs";
import {getItemNutrition, isNutritionFoodItem} from "./dailyNeeds";
import {getItemDefinition} from "../economy/pricing";

const FOOD_CARRIED_SHELF_LIFE = 999;

export function addCarriedFoodItem(
  gameData: GameData,
  adventurer: Adventurer,
  item: ItemDefinition,
  amount: number
): void {
  if (amount <= 0) {
    return;
  }

  const existing = adventurer.carriedItems.find((entry) => entry.itemId === item.id);
  const uses = Math.max(1, item.uses ?? 1);
  if (existing) {
    existing.amount += amount;
    return;
  }

  adventurer.carriedItems.push({
    carryId: `carry:${adventurer.instanceId}:${item.id}:${gameData.day}:${adventurer.carriedItems.length + 1}`,
    itemId: item.id,
    amount,
    remainingShelfLife: FOOD_CARRIED_SHELF_LIFE,
    remainingUses: uses
  });
}

export function consumeCarriedNutrition(
  gameData: GameData,
  adventurer: Adventurer,
  need: number
): {consumedNutrition: number; itemName: string | null} {
  if (need <= 0) {
    return {consumedNutrition: 0, itemName: null};
  }

  let remainingNeed = need;
  let consumedNutrition = 0;
  let lastItemName: string | null = null;
  const candidates = adventurer.carriedItems
    .filter((entry) => isNutritionFoodItem(gameData, entry.itemId))
    .map((entry) => ({
      entry,
      item: getItemDefinition(gameData, entry.itemId),
      nutrition: getItemNutrition(gameData, entry.itemId)
    }))
    .filter((candidate): candidate is typeof candidate & {item: ItemDefinition} => Boolean(candidate.item))
    .sort((left, right) => {
      const leftWaste = Math.max(0, left.nutrition - remainingNeed);
      const rightWaste = Math.max(0, right.nutrition - remainingNeed);
      if (leftWaste !== rightWaste) {
        return leftWaste - rightWaste;
      }

      return right.nutrition - left.nutrition;
    });

  for (const candidate of candidates) {
    if (remainingNeed <= 0) {
      break;
    }

    const unitsNeeded = Math.ceil(remainingNeed / candidate.nutrition);
    const unitsToConsume = Math.min(unitsNeeded, candidate.entry.amount);
    if (unitsToConsume <= 0) {
      continue;
    }

    candidate.entry.amount -= unitsToConsume;
    const nutritionGained = unitsToConsume * candidate.nutrition;
    remainingNeed = Math.max(0, remainingNeed - nutritionGained);
    consumedNutrition += nutritionGained;
    lastItemName = candidate.item.name;

    for (let index = 0; index < unitsToConsume; index += 1) {
      applyFoodItemBuffs(gameData, adventurer, candidate.item);
    }
  }

  adventurer.carriedItems = adventurer.carriedItems.filter((entry) => entry.amount > 0);
  return {consumedNutrition, itemName: lastItemName};
}

export function getCarriedFoodNutritionTotal(gameData: GameData, adventurer: Adventurer): number {
  return adventurer.carriedItems.reduce((sum, entry) => {
    if (!isNutritionFoodItem(gameData, entry.itemId)) {
      return sum;
    }

    return sum + entry.amount * getItemNutrition(gameData, entry.itemId);
  }, 0);
}
