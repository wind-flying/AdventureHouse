import type {Adventurer, GameData, Quest, StoryEntry} from "../../core/types";
import {createStoryEntry} from "../../text/storyText";
import {getItemStackAmount, removeItemStack} from "../inventory";
import {addCarriedFoodItem} from "./carriedFood";
import {
  getItemNutrition,
  getQuestTrailNutritionNeed,
  getRecommendedTrailRationQuantity
} from "./dailyNeeds";
import {purchaseNutritionForAdventurer} from "./foodAllocation";
import {getItemDefinition} from "../economy/pricing";

export function transferQuestProvisionRations(
  gameData: GameData,
  adventurer: Adventurer,
  quest: Quest,
  nextDayEntries: StoryEntry[]
): void {
  const provision = quest.provisionRations;
  if (!provision) {
    return;
  }

  const item = getItemDefinition(gameData, provision.itemId);
  if (!item) {
    return;
  }

  addCarriedFoodItem(gameData, adventurer, item, provision.quantity);
  nextDayEntries.push(
    createStoryEntry("quest_provision_transferred", {
      day: gameData.day,
      adventurerName: adventurer.name,
      questDisplayId: quest.displayId,
      itemName: item.name,
      quantity: provision.quantity
    })
  );
}

export function provisionQuestTrailRations(
  gameData: GameData,
  adventurer: Adventurer,
  quest: Quest,
  nextDayEntries: StoryEntry[]
): void {
  const totalNeed = getQuestTrailNutritionNeed(gameData, quest);
  const carriedBefore = getCarriedNutritionForQuest(gameData, adventurer);
  let remainingNeed = Math.max(0, totalNeed - carriedBefore);

  if (remainingNeed > 0) {
    const purchased = purchaseNutritionForAdventurer(
      gameData,
      adventurer,
      remainingNeed,
      nextDayEntries,
      "stock"
    );
    remainingNeed = Math.max(0, remainingNeed - purchased);
  }

  if (remainingNeed <= 0) {
    return;
  }

  nextDayEntries.push(
    createStoryEntry("trail_ration_shortfall", {
      day: gameData.day,
      adventurerName: adventurer.name,
      questDisplayId: quest.displayId,
      shortfall: remainingNeed
    })
  );
}

function getCarriedNutritionForQuest(gameData: GameData, adventurer: Adventurer): number {
  return adventurer.carriedItems.reduce((sum, entry) => {
    const nutrition = getItemNutrition(gameData, entry.itemId);
    return sum + entry.amount * nutrition;
  }, 0);
}

export function tryReserveQuestProvisionFromPlayer(
  gameData: GameData,
  quest: Pick<Quest, "totalDays" | "risk">
): {ok: true; provision: NonNullable<Quest["provisionRations"]>} | {ok: false; message: string} {
  const recommendation = getRecommendedTrailRationQuantity(gameData, quest);
  const available = getItemStackAmount(gameData, recommendation.itemId);
  if (available < recommendation.quantity) {
    const item = getItemDefinition(gameData, recommendation.itemId);
    return {
      ok: false,
      message: `供粮不足：需要 ${recommendation.quantity} 份${item?.name ?? recommendation.itemId}，当前库存 ${available}。`
    };
  }

  removeItemStack(gameData, recommendation.itemId, recommendation.quantity);
  return {
    ok: true,
    provision: {
      itemId: recommendation.itemId,
      quantity: recommendation.quantity,
      tier: recommendation.tier
    }
  };
}
