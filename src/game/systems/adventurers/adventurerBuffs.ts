import type {
  Adventurer,
  AdventurerActiveBuff,
  AdventurerCapabilities,
  AdventurerCapabilityAxis,
  GameData,
  ItemDefinition,
  ItemEffectDefinition
} from "../../core/types";
import {isFoodItem} from "../items/itemModel";

export function getBuffDurationScale(
  expiresDay: number,
  currentDay: number,
  questTotalDays?: number
): number {
  const remainingDays = Math.max(0, expiresDay - currentDay);
  if (!questTotalDays || questTotalDays <= 0) {
    return remainingDays > 0 ? 1 : 0;
  }

  return Math.min(1, remainingDays / questTotalDays);
}

export function getEffectiveCapabilitiesWithBuffs(
  adventurer: Adventurer,
  currentDay: number,
  questTotalDays?: number
): AdventurerCapabilities {
  const capabilities = {...adventurer.capabilities};

  adventurer.activeBuffs.forEach((buff) => {
    const scale = getBuffDurationScale(buff.expiresDay, currentDay, questTotalDays);
    if (scale <= 0) {
      return;
    }

    buff.effects.forEach((effect) => {
      if (effect.type !== "capability" || effect.duration !== "days" || !isCapabilityTarget(effect.target)) {
        return;
      }

      const scaledEffect: ItemEffectDefinition = {
        ...effect,
        value: effect.operation === "multiply"
          ? 1 + (effect.value - 1) * scale
          : effect.value * scale
      };
      capabilities[effect.target] = applyEffectValue(capabilities[effect.target], scaledEffect);
    });
  });

  return capabilities;
}

export function withQuestBuffedCapabilities(
  adventurer: Adventurer,
  currentDay: number,
  questTotalDays: number
): Adventurer {
  return {
    ...adventurer,
    capabilities: getEffectiveCapabilitiesWithBuffs(adventurer, currentDay, questTotalDays)
  };
}

export function applyFoodItemBuffs(
  gameData: GameData,
  adventurer: Adventurer,
  item: ItemDefinition
): AdventurerActiveBuff | null {
  const dayBuffEffects = item.effects.filter((effect) => effect.duration === "days");
  if (dayBuffEffects.length === 0) {
    return null;
  }

  const durationDays = Math.max(
    1,
    ...dayBuffEffects.map((effect) => effect.durationDays ?? 1)
  );

  const buff: AdventurerActiveBuff = {
    buffId: `buff:${adventurer.id}:${gameData.day}:${item.id}:${adventurer.activeBuffs.length + 1}`,
    itemId: item.id,
    itemName: item.name,
    appliedDay: gameData.day,
    expiresDay: gameData.day + durationDays,
    effects: dayBuffEffects.map((effect) => ({...effect}))
  };

  adventurer.activeBuffs.push(buff);
  return buff;
}

export function expireAdventurerBuffs(gameData: GameData): void {
  const day = gameData.day;
  gameData.adventurers.forEach((adventurer) => {
    adventurer.activeBuffs = adventurer.activeBuffs.filter((buff) => buff.expiresDay > day);
  });
}

export function getActiveBuffRemainingDays(buff: AdventurerActiveBuff, currentDay: number): number {
  return Math.max(0, buff.expiresDay - currentDay);
}

function applyEffectValue(currentValue: number, effect: ItemEffectDefinition): number {
  const nextValue = effect.operation === "multiply"
    ? currentValue * effect.value
    : currentValue + effect.value;
  return Math.max(0, Math.round(nextValue * 100) / 100);
}

function isCapabilityTarget(target: string): target is AdventurerCapabilityAxis {
  return ["physique", "survival", "exploration", "observation", "combat"].includes(target);
}
