import {getDiscoveryLevelFromPoints} from "./adventurers/adventurerInstances";
import {
  getQuestSuccessBreakdown,
  type QuestResolutionInput,
  type QuestSuccessBreakdown
} from "./quests/taskResolution";
import type {
  ActionResult,
  Adventurer,
  AdventurerCapabilityAxis,
  AdventurerGiftItem,
  GameData,
  ItemDefinition,
  ItemEffectDefinition,
  QuestFeatureAxis
} from "../core/types";

const GIFTING_TUNING = {
  acceptanceBaseChance: 0.42,
  acceptedAcquaintanceGain: 1,
  maxAcquaintanceForGiftScore: 7,
  financeScore: 0.5
} as const;

export interface GiftableItemView {
  item: ItemDefinition;
  amount: number;
}

export interface GiftableAdventurerView {
  adventurer: Adventurer;
  carriedCount: number;
}

export interface GiftedItemResolution {
  outcome: "success" | "failure";
  successBreakdown: QuestSuccessBreakdown;
  successChance: number;
  rolledChance: number;
  usedGiftItemIds: Set<string>;
}

export function getGiftableItems(gameData: GameData): GiftableItemView[] {
  return gameData.itemDefinitions
    .map((item) => ({
      item,
      amount: gameData.player.inventory.itemStacks[item.id] ?? 0
    }))
    .filter(({amount}) => amount > 0)
    .sort((left, right) => left.item.sortOrder - right.item.sortOrder);
}

export function getGiftableAdventurers(gameData: GameData): GiftableAdventurerView[] {
  return gameData.adventurers
    .filter((adventurer) => adventurer.knownLevel !== "heard" && adventurer.currentQuestId === null)
    .map((adventurer) => ({
      adventurer,
      carriedCount: adventurer.giftedItems.length
    }));
}

export function giftItemsToAdventurer(gameData: GameData, adventurerId: string, itemIds: string[]): ActionResult {
  const adventurer = gameData.adventurers.find((candidate) => candidate.id === adventurerId);
  if (!adventurer) {
    return {ok: false, type: "error", message: "赠送失败：找不到这名冒险者。"};
  }

  if (adventurer.currentQuestId !== null) {
    return {ok: false, type: "error", message: `${adventurer.name} 正在出任务，不能赠送物品。`};
  }

  return resolveGiftBatch(gameData, [adventurer], itemIds);
}

export function giftItemToAdventurers(gameData: GameData, itemId: string, adventurerIds: string[]): ActionResult {
  const adventurers = adventurerIds
    .map((adventurerId) => gameData.adventurers.find((candidate) => candidate.id === adventurerId) ?? null)
    .filter((adventurer): adventurer is Adventurer => adventurer !== null && adventurer.currentQuestId === null);

  if (adventurers.length === 0) {
    return {ok: false, type: "error", message: "赠送失败：没有可赠送的城镇内冒险者。"};
  }

  return resolveGiftBatch(gameData, adventurers, [itemId]);
}

export function decayGiftedItemsAfterQuest(adventurer: Adventurer, usedGiftItemIds: Set<string>): void {
  adventurer.giftedItems = adventurer.giftedItems
    .map((gift) => ({
      ...gift,
      remainingShelfLife: gift.remainingShelfLife - 1,
      remainingUses: usedGiftItemIds.has(gift.giftId) ? gift.remainingUses - 1 : gift.remainingUses
    }))
    .filter((gift) => gift.remainingShelfLife > 0 && gift.remainingUses > 0);
}

export function tryResolveFailureWithGiftedItems(
  gameData: GameData,
  adventurer: Adventurer,
  input: QuestResolutionInput,
  matchingIntelCount: number,
  initialBreakdown: QuestSuccessBreakdown
): GiftedItemResolution {
  const usedGiftItemIds = new Set<string>();
  let effectiveInput = cloneResolutionInput(input);
  let effectiveAdventurer = cloneAdventurerForGiftEffects(adventurer);
  let currentBreakdown = initialBreakdown;
  let lastRolledChance = 1;

  while (hasUsableGiftItems(gameData, adventurer, usedGiftItemIds)) {
    if (Math.random() > getGiftUseChance(adventurer)) {
      break;
    }

    const useLimit = getGiftSingleUseLimit(adventurer);
    let usedThisPass = 0;
    while (usedThisPass < useLimit) {
      const bestGift = findBestGiftForQuest(
        gameData,
        adventurer,
        effectiveInput,
        effectiveAdventurer,
        matchingIntelCount,
        currentBreakdown.finalChance,
        usedGiftItemIds
      );
      if (!bestGift) {
        break;
      }

      usedGiftItemIds.add(bestGift.gift.giftId);
      effectiveInput = bestGift.nextInput;
      effectiveAdventurer = bestGift.nextAdventurer;
      currentBreakdown = bestGift.nextBreakdown;
      usedThisPass += 1;

      const rolledChance = Math.random();
      lastRolledChance = rolledChance;
      if (rolledChance < currentBreakdown.finalChance) {
        return {
          outcome: "success",
          successBreakdown: currentBreakdown,
          successChance: currentBreakdown.finalChance,
          rolledChance,
          usedGiftItemIds
        };
      }
    }

    if (usedThisPass === 0) {
      break;
    }
  }

  return {
    outcome: "failure",
    successBreakdown: currentBreakdown,
    successChance: currentBreakdown.finalChance,
    rolledChance: lastRolledChance,
    usedGiftItemIds
  };
}

function resolveGiftBatch(gameData: GameData, adventurers: Adventurer[], itemIds: string[]): ActionResult {
  const accepted: string[] = [];
  const rejected: string[] = [];

  adventurers.forEach((adventurer) => {
    itemIds.forEach((itemId) => {
      const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
      const amount = gameData.player.inventory.itemStacks[itemId] ?? 0;
      if (!item || amount <= 0) {
        return;
      }

      const chance = getGiftAcceptanceChance(adventurer, item);
      if (Math.random() <= chance) {
        gameData.player.inventory.itemStacks[itemId] = amount - 1;
        adventurer.giftedItems.push(createAdventurerGiftItem(gameData, adventurer, item));
        adventurer.acquaintancePoints += GIFTING_TUNING.acceptedAcquaintanceGain;
        adventurer.knownLevel = getDiscoveryLevelFromPoints(adventurer.acquaintancePoints);
        accepted.push(`${adventurer.name} 接受了 ${item.name}`);
        return;
      }

      rejected.push(`${adventurer.name} 没有接受 ${item.name}`);
    });
  });

  if (accepted.length === 0 && rejected.length === 0) {
    return {ok: false, type: "error", message: "赠送失败：没有可赠送的物品。"};
  }

  return {
    ok: accepted.length > 0,
    type: accepted.length > 0 ? "success" : "info",
    message: [...accepted, ...rejected].join("；")
  };
}

function createAdventurerGiftItem(
  gameData: GameData,
  adventurer: Adventurer,
  item: ItemDefinition
): AdventurerGiftItem {
  const sequence = adventurer.giftedItems.length + 1;
  return {
    giftId: `gift:${adventurer.id}:${gameData.day}:${sequence}:${item.id}`,
    itemId: item.id,
    giftedDay: gameData.day,
    remainingShelfLife: Math.max(1, item.shelfLifeQuests),
    remainingUses: Math.max(1, item.uses)
  };
}

function getGiftAcceptanceChance(adventurer: Adventurer, item: ItemDefinition): number {
  const acquaintanceScore = Math.min(
    adventurer.acquaintancePoints / GIFTING_TUNING.maxAcquaintanceForGiftScore,
    1
  );
  const compatibilityScore = getItemCompatibilityScore(adventurer, item);
  const valueScore = Math.min(item.giftValue / 10, 1);
  const personalityScore =
    adventurer.personality.sociability * 0.18
    + adventurer.personality.greed * valueScore * 0.14
    + adventurer.personality.diligence * compatibilityScore * 0.08
    - adventurer.personality.caution * Math.max(0, 0.5 - compatibilityScore) * 0.16;

  return clamp(
    GIFTING_TUNING.acceptanceBaseChance
      + acquaintanceScore * 0.2
      + compatibilityScore * 0.2
      + valueScore * 0.08
      + GIFTING_TUNING.financeScore * 0.04
      + personalityScore,
    0.08,
    0.95
  );
}

function getItemCompatibilityScore(adventurer: Adventurer, item: ItemDefinition): number {
  if (item.effects.length === 0) {
    return 0.35;
  }

  const scores = item.effects.map((effect) => {
    if (effect.type === "capability" && isCapabilityTarget(effect.target)) {
      return 1 - clamp(adventurer.capabilities[effect.target] / 100, 0, 1);
    }

    if (effect.type === "questFeature") {
      return effect.value < 0 ? 0.62 : 0.42;
    }

    return 0.35;
  });

  return clamp(scores.reduce((sum, score) => sum + score, 0) / scores.length, 0, 1);
}

function hasUsableGiftItems(
  gameData: GameData,
  adventurer: Adventurer,
  usedGiftItemIds: Set<string>
): boolean {
  return adventurer.giftedItems.some((gift) => {
    return gift.remainingShelfLife > 0
      && gift.remainingUses > 0
      && !usedGiftItemIds.has(gift.giftId)
      && Boolean(gameData.itemDefinitions.find((item) => item.id === gift.itemId));
  });
}

function findBestGiftForQuest(
  gameData: GameData,
  adventurer: Adventurer,
  input: QuestResolutionInput,
  effectiveAdventurer: Adventurer,
  matchingIntelCount: number,
  currentChance: number,
  usedGiftItemIds: Set<string>
) {
  return adventurer.giftedItems
    .filter((gift) => gift.remainingShelfLife > 0 && gift.remainingUses > 0 && !usedGiftItemIds.has(gift.giftId))
    .map((gift) => {
      const item = gameData.itemDefinitions.find((candidate) => candidate.id === gift.itemId);
      if (!item) {
        return null;
      }

      const nextInput = cloneResolutionInput(input);
      const nextAdventurer = cloneAdventurerForGiftEffects(effectiveAdventurer);
      applyItemEffects(nextInput, nextAdventurer, item.effects);
      const nextBreakdown = getQuestSuccessBreakdown(nextInput, nextAdventurer, matchingIntelCount);
      return {
        gift,
        item,
        nextInput,
        nextAdventurer,
        nextBreakdown,
        gain: nextBreakdown.finalChance - currentChance
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null && candidate.gain > 0.001)
    .sort((left, right) => right.gain - left.gain)[0] ?? null;
}

function applyItemEffects(
  input: QuestResolutionInput,
  adventurer: Adventurer,
  effects: ItemEffectDefinition[]
): void {
  effects.forEach((effect) => {
    if (effect.type === "capability" && isCapabilityTarget(effect.target)) {
      adventurer.capabilities[effect.target] = applyEffectValue(adventurer.capabilities[effect.target], effect);
      return;
    }

    if (effect.type === "questFeature" && isQuestFeatureTarget(effect.target)) {
      input.features[effect.target] = applyEffectValue(input.features[effect.target], effect);
    }
  });
}

function applyEffectValue(currentValue: number, effect: ItemEffectDefinition): number {
  const nextValue = effect.operation === "multiply"
    ? currentValue * effect.value
    : currentValue + effect.value;
  return Math.max(0, Math.round(nextValue * 100) / 100);
}

function getGiftUseChance(adventurer: Adventurer): number {
  return clamp(
    0.28
      + adventurer.personality.resilience * 0.22
      + adventurer.personality.caution * 0.18
      + adventurer.personality.discipline * 0.14
      - adventurer.personality.greed * 0.06,
    0.15,
    0.9
  );
}

function getGiftSingleUseLimit(adventurer: Adventurer): number {
  const score = adventurer.personality.discipline + adventurer.personality.resilience + adventurer.personality.caution;
  return clampInteger(1 + Math.floor(score), 1, 3);
}

function cloneResolutionInput(input: QuestResolutionInput): QuestResolutionInput {
  return {
    ...input,
    features: {...input.features}
  };
}

function cloneAdventurerForGiftEffects(adventurer: Adventurer): Adventurer {
  return {
    ...adventurer,
    capabilities: {...adventurer.capabilities},
    personality: {...adventurer.personality},
    giftedItems: adventurer.giftedItems.map((gift) => ({...gift}))
  };
}

function isCapabilityTarget(target: string): target is AdventurerCapabilityAxis {
  return ["physique", "survival", "exploration", "observation", "combat"].includes(target);
}

function isQuestFeatureTarget(target: string): target is QuestFeatureAxis {
  return [
    "danger",
    "challenge",
    "durationPressure",
    "uncertainty",
    "investigationComplexity",
    "reportDifficulty",
    "stability"
  ].includes(target);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
