import type {Adventurer, GameData, StoryEntry} from "../../core/types";
import {buildDailyFoodTalkNote} from "../../text/adventurerTalkText";
import {canSellItemAtShop} from "../economy/establishment";
import {getShopPrice} from "../economy/innRetail";
import {getAnchorPrice, getBuyPrice} from "../economy/marketPricing";
import {getMarketStockAmount, removeMarketStock} from "../economy/marketStock";
import {getItemStackAmount, removeItemStack} from "../inventory";
import {applyFoodItemBuffs} from "./adventurerBuffs";
import {addCarriedFoodItem, consumeCarriedNutrition} from "./carriedFood";
import {
  getDailyFoodNutritionNeed,
  getItemNutrition,
  getNutritionForRef,
  isNutritionFoodItem,
  isNutritionIngredient
} from "./dailyNeeds";
import {getItemDefinition} from "../economy/pricing";
import {scoreFoodOffer, type FoodScoringState} from "./foodScoring";

export type FoodOfferSource = "shop" | "market";

export interface FoodOffer {
  offerKey: string;
  source: FoodOfferSource;
  kind: "resource" | "item";
  refId: string;
  unitPrice: number;
  referencePrice: number;
  nutrition: number;
  stock: number;
}

interface AdventurerFoodParticipant {
  adventurer: Adventurer;
  remainingNeed: number;
  allocationCounts: Map<string, number>;
  active: boolean;
}

export function resolveDailyFoodNeeds(gameData: GameData, _nextDayEntries: StoryEntry[]): void {
  const dailyNeed = getDailyFoodNutritionNeed(gameData);
  clearDailyFoodTalkNotes(gameData);
  const participants = getFoodParticipants(gameData, dailyNeed);
  const offers = buildFoodOfferPool(gameData);

  participants.forEach((participant) => {
    const carriedResult = consumeCarriedNutrition(gameData, participant.adventurer, participant.remainingNeed);
    participant.remainingNeed = Math.max(0, participant.remainingNeed - carriedResult.consumedNutrition);
    if (carriedResult.consumedNutrition > 0) {
      recordDailyFoodTalkNote(
        participant.adventurer,
        "背包",
        carriedResult.itemName ?? "食物"
      );
    }
  });

  runGreedyFoodAllocation(gameData, participants, offers, "consume");
  updateFoodDeficitState(participants);
}

export function purchaseNutritionForAdventurer(
  gameData: GameData,
  adventurer: Adventurer,
  nutritionNeed: number,
  _nextDayEntries: StoryEntry[],
  mode: "consume" | "stock"
): number {
  if (nutritionNeed <= 0) {
    return 0;
  }

  const participants: AdventurerFoodParticipant[] = [{
    adventurer,
    remainingNeed: nutritionNeed,
    allocationCounts: new Map(),
    active: true
  }];
  const offers = buildFoodOfferPool(gameData);
  runGreedyFoodAllocation(gameData, participants, offers, mode);
  return nutritionNeed - participants[0].remainingNeed;
}

function clearDailyFoodTalkNotes(gameData: GameData): void {
  gameData.adventurers.forEach((adventurer) => {
    if (adventurer.knownLevel !== "heard") {
      adventurer.dailyFoodTalkNote = null;
    }
  });
}

function recordDailyFoodTalkNote(adventurer: Adventurer, sourceText: string, itemName: string): void {
  adventurer.dailyFoodTalkNote = buildDailyFoodTalkNote(sourceText, itemName);
}

function getFoodParticipants(gameData: GameData, dailyNeed: number): AdventurerFoodParticipant[] {
  return gameData.adventurers
    .filter((adventurer) => adventurer.knownLevel !== "heard")
    .map((adventurer) => ({
      adventurer,
      remainingNeed: dailyNeed,
      allocationCounts: new Map(),
      active: adventurer.currentQuestId === null
    }));
}

function buildFoodOfferPool(gameData: GameData): FoodOffer[] {
  const offers: FoodOffer[] = [];

  gameData.itemDefinitions.forEach((item) => {
    if (!canSellItemAtShop(gameData, item.id) || !isNutritionFoodItem(gameData, item.id)) {
      return;
    }

    const stock = getItemStackAmount(gameData, item.id);
    if (stock <= 0) {
      return;
    }

    offers.push({
      offerKey: `shop:item:${item.id}`,
      source: "shop",
      kind: "item",
      refId: item.id,
      unitPrice: getShopPrice(gameData, item.id),
      referencePrice: getAnchorPrice(gameData, "item", item.id),
      nutrition: getItemNutrition(gameData, item.id),
      stock
    });
  });

  gameData.marketListings.forEach((listing) => {
    if (!listing.buyable) {
      return;
    }

    if (listing.kind === "resource") {
      const nutrition = getNutritionForRef(gameData, "resource", listing.refId);
      if (!isNutritionIngredient(gameData, listing.refId)) {
        return;
      }

      const stock = getMarketStockAmount(gameData, "resource", listing.refId);
      if (stock <= 0) {
        return;
      }

      offers.push({
        offerKey: `market:resource:${listing.refId}`,
        source: "market",
        kind: "resource",
        refId: listing.refId,
        unitPrice: getBuyPrice(gameData, "resource", listing.refId),
        referencePrice: getAnchorPrice(gameData, "resource", listing.refId),
        nutrition,
        stock
      });
      return;
    }

    const nutrition = getItemNutrition(gameData, listing.refId);
    if (nutrition <= 0) {
      return;
    }

    const itemStock = getMarketStockAmount(gameData, "item", listing.refId);
    if (itemStock <= 0) {
      return;
    }

    offers.push({
      offerKey: `market:item:${listing.refId}`,
      source: "market",
      kind: "item",
      refId: listing.refId,
      unitPrice: getBuyPrice(gameData, "item", listing.refId),
      referencePrice: getAnchorPrice(gameData, "item", listing.refId),
      nutrition,
      stock: itemStock
    });
  });

  return offers;
}

function runGreedyFoodAllocation(
  gameData: GameData,
  participants: AdventurerFoodParticipant[],
  offers: FoodOffer[],
  mode: "consume" | "stock"
): void {
  while (true) {
    let bestParticipant: AdventurerFoodParticipant | undefined;
    let bestOffer: FoodOffer | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const participant of participants) {
      if (!participant.active || participant.remainingNeed <= 0) {
        continue;
      }

      const scoringState: FoodScoringState = {
        remainingNeed: participant.remainingNeed,
        allocationCounts: participant.allocationCounts
      };

      for (const offer of offers) {
        const score = scoreFoodOffer(gameData, participant.adventurer, offer, scoringState);
        if (score === Number.NEGATIVE_INFINITY) {
          continue;
        }

        const tieBreak = compareTieBreak(participant.adventurer.instanceId, offer.offerKey);
        const adjustedScore = score + tieBreak * 1e-9;
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestParticipant = participant;
          bestOffer = offer;
        }
      }
    }

    if (!bestParticipant || !bestOffer) {
      break;
    }

    executeFoodAllocation(gameData, bestParticipant, bestOffer, mode);
    if (bestOffer.stock <= 0) {
      const offerIndex = offers.indexOf(bestOffer);
      if (offerIndex >= 0) {
        offers.splice(offerIndex, 1);
      }
    }

    if (!canAffordAnyOffer(bestParticipant.adventurer, offers)) {
      bestParticipant.active = false;
    }
  }
}

function executeFoodAllocation(
  gameData: GameData,
  participant: AdventurerFoodParticipant,
  offer: FoodOffer,
  mode: "consume" | "stock"
): void {
  const {adventurer} = participant;
  if (adventurer.carriedMoney < offer.unitPrice || offer.stock <= 0) {
    return;
  }

  adventurer.carriedMoney -= offer.unitPrice;
  offer.stock -= 1;
  participant.allocationCounts.set(offer.offerKey, (participant.allocationCounts.get(offer.offerKey) ?? 0) + 1);

  if (offer.source === "shop" && offer.kind === "item") {
    removeItemStack(gameData, offer.refId, 1);
    gameData.player.money += offer.unitPrice;
  }

  if (offer.source === "market") {
    removeMarketStock(gameData, offer.kind, offer.refId, 1);
  }

  const item = offer.kind === "item" ? getItemDefinition(gameData, offer.refId) : null;
  const sourceText = offer.source === "shop" ? "店铺" : "市场";
  const itemName = item?.name ?? offer.refId;

  if (mode === "stock" && item) {
    addCarriedFoodItem(gameData, adventurer, item, 1);
    participant.remainingNeed = Math.max(0, participant.remainingNeed - offer.nutrition);
    return;
  }

  participant.remainingNeed = Math.max(0, participant.remainingNeed - offer.nutrition);
  if (item) {
    applyFoodItemBuffs(gameData, adventurer, item);
  }

  recordDailyFoodTalkNote(adventurer, sourceText, itemName);
}

function canAffordAnyOffer(adventurer: Adventurer, offers: FoodOffer[]): boolean {
  return offers.some((offer) => offer.stock > 0 && adventurer.carriedMoney >= offer.unitPrice);
}

function updateFoodDeficitState(participants: AdventurerFoodParticipant[]): void {
  participants.forEach((participant) => {
    const met = participant.remainingNeed <= 0;
    if (met) {
      participant.adventurer.foodDeficitStreak = 0;
      return;
    }

    participant.adventurer.foodDeficitStreak += 1;
  });
}

export function updateDaysWithoutQuestWhileDeficit(gameData: GameData): void {
  gameData.adventurers.forEach((adventurer) => {
    if (adventurer.foodDeficitStreak <= 0) {
      adventurer.daysWithoutQuestWhileDeficit = 0;
      return;
    }

    if (adventurer.currentQuestId === null) {
      adventurer.daysWithoutQuestWhileDeficit += 1;
      return;
    }

    adventurer.daysWithoutQuestWhileDeficit = 0;
  });
}

function compareTieBreak(adventurerId: string, offerKey: string): number {
  const left = `${adventurerId}:${offerKey}`;
  let hash = 0;
  for (let index = 0; index < left.length; index += 1) {
    hash = ((hash << 5) - hash + left.charCodeAt(index)) | 0;
  }

  return hash >>> 0;
}
