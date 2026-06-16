import type {
  EquipmentDefinition,
  EquipmentInstance,
  EquipmentSlot,
  GameData,
  ItemDefinition,
  ItemEffectDefinition,
  PlayerInventory
} from "../core/types";

export function createEmptyInventory(): PlayerInventory {
  return {
    itemStacks: {},
    equipments: []
  };
}

export function createInitialInventory(equipmentDefinitions: EquipmentDefinition[]): PlayerInventory {
  return createInitialInventoryWithItems([], equipmentDefinitions);
}

export function createInitialInventoryWithItems(
  itemDefinitions: ItemDefinition[],
  equipmentDefinitions: EquipmentDefinition[]
): PlayerInventory {
  const starterSword = equipmentDefinitions.find((definition) => definition.id === "starter-training-sword");
  return {
    itemStacks: Object.fromEntries(
      itemDefinitions
        .map((definition) => [definition.id, definition.starterStack ?? 5] as const)
        .filter(([, amount]) => amount > 0)
    ),
    equipments: starterSword
      ? [createEquipmentInstance(starterSword, "equipment:starter-training-sword:initial", 1)]
      : []
  };
}

export function createEquipmentInstance(
  definition: EquipmentDefinition,
  instanceId: string,
  acquiredDay: number
): EquipmentInstance {
  return {
    instanceId,
    definitionId: definition.id,
    slot: definition.slot,
    effects: definition.statRolls.map((roll) => {
      if (roll.mode === "fixed") {
        return {...roll.effect};
      }

      return {
        ...roll.effect,
        value: rollEquipmentStatValue(roll.min, roll.max, roll.precision ?? 0)
      };
    }),
    acquiredDay,
    equippedByAdventurerId: null,
    customName: null
  };
}

export function sanitizeInventory(gameData: GameData, inventory: PlayerInventory | undefined): PlayerInventory {
  if (!inventory) {
    return createEmptyInventory();
  }

  const knownItemIds = new Set(gameData.itemDefinitions.map((definition) => definition.id));
  const equipmentSlotById = new Map(
    gameData.equipmentDefinitions.map((definition) => [definition.id, definition.slot])
  );

  return {
    itemStacks: sanitizeItemStacks(inventory.itemStacks, knownItemIds),
    equipments: sanitizeEquipmentInstances(inventory.equipments, equipmentSlotById)
  };
}

export function findItemDefinition(gameData: GameData, itemId: string): ItemDefinition | null {
  return gameData.itemDefinitions.find((definition) => definition.id === itemId) ?? null;
}

export function findEquipmentDefinition(gameData: GameData, definitionId: string): EquipmentDefinition | null {
  return gameData.equipmentDefinitions.find((definition) => definition.id === definitionId) ?? null;
}

function sanitizeItemStacks(
  itemStacks: Partial<Record<string, number>> | undefined,
  knownItemIds: Set<string>
): Partial<Record<string, number>> {
  if (!itemStacks || typeof itemStacks !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(itemStacks).filter(([itemId, amount]) => {
      return knownItemIds.has(itemId) && typeof amount === "number" && Number.isInteger(amount) && amount > 0;
    })
  );
}

function sanitizeEquipmentInstances(
  equipments: EquipmentInstance[] | undefined,
  equipmentSlotById: Map<string, EquipmentSlot>
): EquipmentInstance[] {
  if (!Array.isArray(equipments)) {
    return [];
  }

  return equipments
    .filter((equipment) => {
      const expectedSlot = equipmentSlotById.get(equipment.definitionId);
      return typeof equipment.instanceId === "string"
        && expectedSlot === equipment.slot
        && Array.isArray(equipment.effects)
        && Number.isInteger(equipment.acquiredDay)
        && equipment.acquiredDay >= 1;
    })
    .map((equipment) => ({
      ...equipment,
      effects: equipment.effects.map((effect): ItemEffectDefinition => ({...effect})),
      equippedByAdventurerId: equipment.equippedByAdventurerId ?? null,
      customName: typeof equipment.customName === "string" && equipment.customName.trim().length > 0
        ? equipment.customName
        : null
    }));
}

function rollEquipmentStatValue(min: number, max: number, precision: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const value = low + Math.random() * (high - low);
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
