import type {Adventurer, GameData} from "../../core/types";
import type {FoodOffer} from "./foodAllocation";

export interface FoodScoringState {
  remainingNeed: number;
  allocationCounts: Map<string, number>;
}

export function scoreFoodOffer(
  gameData: GameData,
  adventurer: Adventurer,
  offer: FoodOffer,
  state: FoodScoringState
): number {
  if (adventurer.carriedMoney < offer.unitPrice) {
    return Number.NEGATIVE_INFINITY;
  }

  if (offer.stock <= 0 || state.remainingNeed <= 0 || offer.nutrition <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const preferenceMatch = getPreferenceMatch(adventurer, offer, gameData);
  const priceAppeal = getPriceAppeal(adventurer, offer, gameData);
  const venueAffinity = getVenueAffinity(adventurer, offer);
  const nutritionFit = getNutritionFit(state.remainingNeed, offer.nutrition);
  const urgency = getUrgency(state.remainingNeed, adventurer.foodDeficitStreak, gameData);
  const satietyPenalty = (state.allocationCounts.get(offer.offerKey) ?? 0) * 0.18;

  return preferenceMatch + priceAppeal + venueAffinity + nutritionFit + urgency - satietyPenalty;
}

function getPreferenceMatch(adventurer: Adventurer, offer: FoodOffer, gameData: GameData): number {
  if (offer.kind === "resource") {
    const ingredientBonus = adventurer.preferences.includes(offer.refId) ? 0.08 : 0;
    return -gameData.dailyNeedsConfig.rawIngredientScoringPenalty + ingredientBonus;
  }

  if (offer.refId.includes("trail-ration")) {
    return 0.2;
  }

  return offer.refId.includes("cake") ? 0.28 : 0.16;
}

function getPriceAppeal(adventurer: Adventurer, offer: FoodOffer, gameData: GameData): number {
  const referencePrice = offer.referencePrice > 0 ? offer.referencePrice : offer.unitPrice;
  const priceRatio = offer.unitPrice / Math.max(1, referencePrice);
  const greedFactor = (adventurer.personality.greed + 1) / 2;
  return Math.max(0, 1.1 - priceRatio) * (0.35 + greedFactor * 0.25);
}

function getVenueAffinity(adventurer: Adventurer, offer: FoodOffer): number {
  if (offer.source === "shop") {
    return Math.min(adventurer.acquaintancePoints / 8, 1) * 0.22;
  }

  return 0.08;
}

function getNutritionFit(remainingNeed: number, nutrition: number): number {
  if (remainingNeed <= 0) {
    return 0;
  }

  const waste = Math.max(0, nutrition - remainingNeed);
  const fit = nutrition / Math.max(remainingNeed, nutrition);
  return fit * 0.45 - waste * 0.12;
}

function getUrgency(remainingNeed: number, foodDeficitStreak: number, gameData: GameData): number {
  const dailyNeed = gameData.dailyNeedsConfig.categories.food.dailyNutritionMilli / 1000;
  const needRatio = remainingNeed / Math.max(1, dailyNeed);
  const streakFactor = Math.min(foodDeficitStreak, 5) * 0.04;
  return needRatio * 0.3 + streakFactor;
}
