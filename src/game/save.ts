import {createInitialGameData, INITIAL_DAY, LOG_HISTORY_LIMIT} from "./state";
import {createInitialBailoutState} from "./systems/economy/bailout";
import {sanitizeMarketStock} from "./systems/economy/marketStock";
import {
  createInitialAdventurerInstances,
  restoreAdventurerInstance,
  restoreLegacySavedAdventurer,
  restoreLegacyAdventurerState,
} from "./systems/adventurers/adventurerInstances";
import {restoreQuestResult, toSavedQuestResult} from "./systems/quests/taskResult";
import {createEmptyInventory, createEquipmentInstance, sanitizeInventory} from "./systems/inventory";
import type {
  GameData,
  PlayerInventory,
  Quest,
  ResultInsightLevel,
  SaveDataV1,
  SaveDataV2,
  SaveDataV3,
  SaveDataV4,
  SaveDataV5,
  SaveDataV6,
  SaveDataV7,
  SaveDataV8,
  SaveDataV9,
  SaveDataV10,
  SaveDataV11,
  SavedAdventurer,
  SavedQuest,
  StoryEntry
} from "./core/types";

const SAVE_STORAGE_KEY = "adventure-house.save";
// 只在持久化结构真正变化时才升级版本。
// 开发阶段的内部重构、公式细调、文案修改不应机械地增加存档版本。
export const SAVE_FORMAT_VERSION = 11 as const;

export function loadGameData(): GameData | null {
  const rawSave = readRawSave();
  if (!rawSave) {
    return null;
  }

  const migratedSave = migrateSaveData(rawSave);
  if (!migratedSave) {
    return null;
  }

  return restoreGameDataFromSave(migratedSave);
}

export function exportSaveData(gameData: GameData): string {
  return JSON.stringify(createSaveData(gameData), null, 2);
}

export function importSaveData(serializedSave: string): GameData | null {
  let rawSave: unknown;
  try {
    rawSave = JSON.parse(serializedSave) as unknown;
  } catch {
    return null;
  }

  const migratedSave = migrateSaveData(rawSave);
  if (!migratedSave) {
    return null;
  }

  return restoreGameDataFromSave(migratedSave);
}

export function saveGameData(gameData: GameData): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(createSaveData(gameData)));
  } catch {
    // 本地存储不可用时静默降级，不阻断当前流程。
  }
}

export function replaceSavedGameData(gameData: GameData): void {
  saveGameData(gameData);
}

export function clearSavedGameData(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // 本地存储不可用时静默降级，不阻断当前流程。
  }
}

function createSaveData(gameData: GameData): SaveDataV11 {
  return {
    version: SAVE_FORMAT_VERSION,
    game: {
      day: gameData.day,
      questIdCounter: gameData.questIdCounter,
      adventurerIdCounter: gameData.adventurerIdCounter,
      pinnedAdventurerIds: [...gameData.pinnedAdventurerIds],
      marketId: gameData.marketId,
      marketStock: Object.fromEntries(
        Object.entries(gameData.marketStock).filter(([, amount]) => amount > 0)
      ),
      player: {
        money: gameData.player.money,
        resultInsightLevel: gameData.player.resultInsightLevel,
        hasGiftedAdventurerItem: gameData.player.hasGiftedAdventurerItem,
        shopPrices: {...gameData.player.shopPrices},
        bailoutAccepted: gameData.player.bailoutAccepted,
        bailoutOfferAmount: gameData.player.bailoutOfferAmount,
        bailoutUnlocked: gameData.player.bailoutUnlocked,
        bailoutPeakMoneySinceDecline: gameData.player.bailoutPeakMoneySinceDecline,
        bailoutDaysBelowThreshold: gameData.player.bailoutDaysBelowThreshold,
        pendingBailoutOffer: gameData.player.pendingBailoutOffer,
        quests: gameData.player.quests.map((quest) => createSavedQuest(quest)),
        stock: Object.fromEntries(
          Object.entries(gameData.player.stock).filter(([, amount]) => amount > 0)
        ),
        inventory: cloneInventory(gameData.player.inventory),
        leads: gameData.player.leads.map((record) => ({...record})),
        discoveries: gameData.player.discoveries.map((record) => ({...record})),
      },
      adventurers: gameData.adventurers.map((adventurer): SavedAdventurer => ({...adventurer})),
      dayLog: gameData.dayLog.map((entry) => ({...entry}))
    }
  };
}

function createSavedQuest(quest: Quest): SavedQuest {
  return {
    ...quest,
    result: quest.result ? toSavedQuestResult(quest.result) : null
  };
}

function ensureConfiguredStartingEquipment(gameData: GameData): void {
  const existingEquipmentIds = new Set(gameData.player.inventory.equipments.map((equipment) => equipment.instanceId));
  gameData.adventurers.forEach((adventurer) => {
    adventurer.startingEquipmentDefinitionIds?.forEach((definitionId, index) => {
      const instanceId = `equipment:${adventurer.id}:${definitionId}:${index + 1}`;
      if (existingEquipmentIds.has(instanceId)) {
        return;
      }

      const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === definitionId);
      if (!definition) {
        return;
      }

      const equipment = createEquipmentInstance(definition, instanceId, INITIAL_DAY);
      equipment.equippedByAdventurerId = adventurer.id;
      gameData.player.inventory.equipments.push(equipment);
      existingEquipmentIds.add(instanceId);
    });
  });
}

function restoreGameDataFromSave(saveData: SaveDataV11): GameData {
  const gameData = createInitialGameData();
  const configuredInitialAdventurers = gameData.adventurers.map((adventurer) => ({...adventurer}));

  gameData.day = getSafePositiveInteger(saveData.game.day, INITIAL_DAY);
  gameData.questIdCounter = getSafePositiveInteger(saveData.game.questIdCounter, gameData.questIdCounter);
  gameData.adventurerIdCounter = getSafePositiveInteger(
    saveData.game.adventurerIdCounter,
    gameData.adventurerIdCounter
  );

  gameData.player.money = getSafeInteger(saveData.game.player.money, gameData.player.money);
  gameData.player.resultInsightLevel = sanitizeResultInsightLevel(saveData.game.player.resultInsightLevel);
  gameData.player.hasGiftedAdventurerItem = saveData.game.player.hasGiftedAdventurerItem === true;
  gameData.player.shopPrices = sanitizeShopPrices(saveData.game.player.shopPrices, gameData.itemDefinitions);
  restoreBailoutState(gameData, saveData.game.player);
  const restoredStock: Record<string, number> = {...gameData.player.stock};
  Object.entries(saveData.game.player.stock).forEach(([resourceId, amount]) => {
    if (resourceId in restoredStock && typeof amount === "number" && amount >= 0) {
      restoredStock[resourceId] = amount;
    }
  });
  gameData.player.stock = restoredStock;
  gameData.player.inventory = sanitizeInventory(gameData, saveData.game.player.inventory);
  gameData.player.leads = saveData.game.player.leads.map((record) => ({...record}));
  gameData.player.discoveries = saveData.game.player.discoveries.map((record) => ({...record}));
  gameData.marketId = typeof saveData.game.marketId === "string" ? saveData.game.marketId : gameData.marketId;
  gameData.marketStock = sanitizeMarketStock(saveData.game.marketStock, gameData);
  gameData.dayLog = sanitizeStoryEntries(saveData.game.dayLog);

  gameData.adventurers = saveData.game.adventurers.map((savedAdventurer) => {
    return restoreAdventurerInstance(gameData.adventurerTemplates, savedAdventurer);
  });
  gameData.adventurers = appendMissingConfiguredInitialAdventurers(
    gameData.adventurers,
    configuredInitialAdventurers
  );
  ensureConfiguredStartingEquipment(gameData);
  gameData.pinnedAdventurerIds = saveData.game.pinnedAdventurerIds.filter((id) => {
    return gameData.adventurers.some((adventurer) => adventurer.instanceId === id);
  });

  gameData.player.quests = saveData.game.player.quests.map((savedQuest) => {
    const quest: Quest = {
      ...savedQuest,
      provisionRations: savedQuest.provisionRations ?? null,
      result: null
    };
    quest.result = savedQuest.result ? restoreQuestResult(gameData, quest, savedQuest.result) : null;
    return quest;
  });

  const validQuestIds = new Set(gameData.player.quests.map((quest) => quest.id));
  const maxQuestId = Math.max(0, ...validQuestIds);
  gameData.questIdCounter = Math.max(gameData.questIdCounter, maxQuestId + 1);
  gameData.adventurerIdCounter = Math.max(
    gameData.adventurerIdCounter,
    getNextGeneratedAdventurerCounter(gameData.adventurers.map((adventurer) => adventurer.instanceId))
  );
  gameData.adventurers = gameData.adventurers.map((adventurer) => ({
    ...adventurer,
    currentQuestId: adventurer.currentQuestId !== null && validQuestIds.has(adventurer.currentQuestId)
      ? adventurer.currentQuestId
      : null
  }));

  return gameData;
}

function readRawSave(): unknown {
  if (!canUseLocalStorage()) {
    return null;
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function migrateSaveData(rawSave: unknown): SaveDataV11 | null {
  if (!rawSave || typeof rawSave !== "object") {
    return null;
  }

  const candidate = rawSave as Partial<SaveDataV1 | SaveDataV2 | SaveDataV3 | SaveDataV4 | SaveDataV5 | SaveDataV6 | SaveDataV7 | SaveDataV8 | SaveDataV9 | SaveDataV10 | SaveDataV11>;
  let migrated: SaveDataV10 | SaveDataV11 | null = null;

  switch (candidate.version) {
    case 1:
      migrated = isSaveDataV1(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(migrateSaveDataV2ToV3(migrateSaveDataV1ToV2(candidate)))))))))
        : null;
      break;
    case 2:
      migrated = isSaveDataV2(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(migrateSaveDataV2ToV3(candidate))))))))
        : null;
      break;
    case 3:
      migrated = isSaveDataV3(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(candidate)))))))
        : null;
      break;
    case 4:
      migrated = isSaveDataV4(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(candidate))))))
        : null;
      break;
    case 5:
      migrated = isSaveDataV5(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(candidate)))))
        : null;
      break;
    case 6:
      migrated = isSaveDataV6(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(migrateSaveDataV6ToV7(candidate))))
        : null;
      break;
    case 7:
      migrated = isSaveDataV7(candidate)
        ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(migrateSaveDataV7ToV8(candidate)))
        : null;
      break;
    case 8:
      migrated = isSaveDataV8(candidate) ? migrateSaveDataV9ToV10(migrateSaveDataV8ToV9(candidate)) : null;
      break;
    case 9:
      migrated = isSaveDataV9(candidate) ? migrateSaveDataV9ToV10(candidate) : null;
      break;
    case 10:
      migrated = isSaveDataV10(candidate) ? candidate : null;
      break;
    case SAVE_FORMAT_VERSION:
      return isSaveDataV11(candidate) ? candidate : null;
    default:
      return null;
  }

  if (!migrated) {
    return null;
  }

  return migrateSaveDataV10ToV11(migrated);
}

type SaveDataCandidate = Partial<SaveDataV1 | SaveDataV2 | SaveDataV3 | SaveDataV4 | SaveDataV5 | SaveDataV6 | SaveDataV7 | SaveDataV8 | SaveDataV9>;

function isSaveDataV1(candidate: SaveDataCandidate): candidate is SaveDataV1 {
  return candidate.version === 1
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV2(candidate: SaveDataCandidate): candidate is SaveDataV2 {
  return candidate.version === 2
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV3(candidate: SaveDataCandidate): candidate is SaveDataV3 {
  return candidate.version === 3
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV4(candidate: SaveDataCandidate): candidate is SaveDataV4 {
  return candidate.version === 4
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV5(candidate: SaveDataCandidate): candidate is SaveDataV5 {
  return candidate.version === 5
    && Number.isInteger(candidate.game?.adventurerIdCounter)
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV6(candidate: SaveDataCandidate): candidate is SaveDataV6 {
  return candidate.version === 6
    && Number.isInteger(candidate.game?.adventurerIdCounter)
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Boolean(candidate.game?.player?.inventory)
    && typeof candidate.game?.player?.inventory === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV7(candidate: SaveDataCandidate): candidate is SaveDataV7 {
  return candidate.version === 7
    && Number.isInteger(candidate.game?.adventurerIdCounter)
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Boolean(candidate.game?.player?.inventory)
    && typeof candidate.game?.player?.inventory === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV8(candidate: SaveDataCandidate): candidate is SaveDataV8 {
  return candidate.version === 8
    && Number.isInteger(candidate.game?.adventurerIdCounter)
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Boolean(candidate.game?.player?.inventory)
    && typeof candidate.game?.player?.inventory === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function isSaveDataV9(candidate: SaveDataCandidate): candidate is SaveDataV9 {
  return candidate.version === 9
    && Number.isInteger(candidate.game?.adventurerIdCounter)
    && Array.isArray(candidate.game?.pinnedAdventurerIds)
    && Array.isArray(candidate.game?.adventurers)
    && Array.isArray(candidate.game?.dayLog)
    && Array.isArray(candidate.game?.player?.quests)
    && Boolean(candidate.game?.player?.stock)
    && typeof candidate.game?.player?.stock === "object"
    && Boolean(candidate.game?.player?.inventory)
    && typeof candidate.game?.player?.inventory === "object"
    && Array.isArray(candidate.game?.player?.leads)
    && Array.isArray(candidate.game?.player?.discoveries);
}

function sanitizeStoryEntries(entries: StoryEntry[]): StoryEntry[] {
  return entries
    .filter((entry) => entry && typeof entry.day === "number" && typeof entry.text === "string")
    .slice(0, LOG_HISTORY_LIMIT)
    .map((entry) => ({...entry}));
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getSafePositiveInteger(value: number, fallback: number): number {
  if (!Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function getSafeInteger(value: number, fallback: number): number {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return value;
}

function sanitizeResultInsightLevel(level: ResultInsightLevel): ResultInsightLevel {
  switch (level) {
    case "aware":
    case "trained":
    case "expert":
      return level;
    case "basic":
    default:
      return "basic";
  }
}

function migrateSaveDataV1ToV2(saveData: SaveDataV1): SaveDataV2 {
  const initialGameData = createInitialGameData();
  const legacyStateMap = new Map(saveData.game.adventurers.map((adventurer) => [adventurer.id, adventurer]));
  const initialAdventurers = createInitialAdventurerInstances(initialGameData.adventurerTemplates, INITIAL_DAY);

  return {
    version: 2,
    game: {
      ...saveData.game,
      adventurers: initialAdventurers.map((adventurer) => {
        const legacyState = legacyStateMap.get(adventurer.templateId ?? adventurer.id)
          ?? legacyStateMap.get(adventurer.id);
        return restoreLegacyAdventurerState(adventurer, legacyState ?? null);
      })
    }
  };
}

function migrateSaveDataV2ToV3(saveData: SaveDataV2): SaveDataV3 {
  const initialGameData = createInitialGameData();

  return {
    version: 3,
    game: {
      ...saveData.game,
      adventurers: saveData.game.adventurers.map((adventurer) => {
        return restoreLegacySavedAdventurer(initialGameData.adventurerTemplates, adventurer);
      })
    }
  };
}

function migrateSaveDataV3ToV4(saveData: SaveDataV3): SaveDataV4 {
  const initialGameData = createInitialGameData();

  return {
    version: 4,
    game: {
      ...saveData.game,
      adventurers: saveData.game.adventurers.map((adventurer) => {
        return restoreLegacySavedAdventurer(initialGameData.adventurerTemplates, adventurer);
      })
    }
  };
}

function migrateSaveDataV4ToV5(saveData: SaveDataV4): SaveDataV5 {
  const instanceIdByLegacyId = new Map(
    saveData.game.adventurers.map((adventurer) => [adventurer.id, adventurer.instanceId])
  );
  const adventurers = saveData.game.adventurers.map((adventurer) => ({
    ...adventurer,
    id: adventurer.instanceId
  }));

  return {
    version: 5,
    game: {
      ...saveData.game,
      adventurerIdCounter: getNextGeneratedAdventurerCounter(
        adventurers.map((adventurer) => adventurer.instanceId)
      ),
      pinnedAdventurerIds: saveData.game.pinnedAdventurerIds.map((id) => {
        return instanceIdByLegacyId.get(id) ?? id;
      }),
      player: {
        ...saveData.game.player,
        quests: saveData.game.player.quests.map((quest) => ({
          ...quest,
          adventurerId: quest.adventurerId
            ? instanceIdByLegacyId.get(quest.adventurerId) ?? quest.adventurerId
            : null
        }))
      },
      adventurers
    }
  };
}

function migrateSaveDataV5ToV6(saveData: SaveDataV5): SaveDataV6 {
  return {
    version: 6,
    game: {
      ...saveData.game,
      player: {
        ...saveData.game.player,
        inventory: createEmptyInventory()
      }
    }
  };
}

function migrateSaveDataV6ToV7(saveData: SaveDataV6): SaveDataV7 {
  return {
    version: 7,
    game: {
      ...saveData.game,
      adventurers: saveData.game.adventurers.map((adventurer) => ({
        ...adventurer,
        giftedItems: adventurer.giftedItems ?? [],
        carriedItems: adventurer.carriedItems ?? [],
        carriedMoney: adventurer.carriedMoney ?? 0
      }))
    }
  };
}

function migrateSaveDataV7ToV8(saveData: SaveDataV7): SaveDataV8 {
  return {
    version: 8,
    game: {
      ...saveData.game,
      player: {
        ...saveData.game.player,
        shopPrices: {}
      }
    }
  };
}

function migrateSaveDataV8ToV9(saveData: SaveDataV8): SaveDataV9 {
  const defaults = createInitialBailoutState();
  return {
    version: 9,
    game: {
      ...saveData.game,
      player: {
        ...saveData.game.player,
        bailoutAccepted: defaults.bailoutAccepted,
        bailoutOfferAmount: defaults.bailoutOfferAmount,
        bailoutUnlocked: defaults.bailoutUnlocked,
        bailoutPeakMoneySinceDecline: defaults.bailoutPeakMoneySinceDecline,
        bailoutDaysBelowThreshold: defaults.bailoutDaysBelowThreshold,
        pendingBailoutOffer: defaults.pendingBailoutOffer
      }
    }
  };
}

function migrateSaveDataV9ToV10(saveData: SaveDataV9): SaveDataV10 {
  return {
    version: 10,
    game: {
      ...saveData.game,
      player: {
        ...saveData.game.player,
        quests: saveData.game.player.quests.map((quest) => ({
          ...quest,
          provisionRations: quest.provisionRations ?? null
        }))
      },
      adventurers: saveData.game.adventurers.map((adventurer) => ({
        ...adventurer,
        foodDeficitStreak: adventurer.foodDeficitStreak ?? 0,
        daysWithoutQuestWhileDeficit: adventurer.daysWithoutQuestWhileDeficit ?? 0
      }))
    }
  };
}

function migrateSaveDataV10ToV11(saveData: SaveDataV10): SaveDataV11 {
  const fresh = createInitialGameData();
  const knownResourceIds = new Set(fresh.resources.map((resource) => resource.id));
  const sanitizedStock = Object.fromEntries(
    Object.entries(saveData.game.player.stock).filter(([resourceId]) => knownResourceIds.has(resourceId))
  );

  return {
    version: 11,
    game: {
      ...saveData.game,
      marketId: fresh.marketId,
      marketStock: {},
      player: {
        ...saveData.game.player,
        stock: sanitizedStock
      }
    }
  };
}

function isSaveDataV10(saveData: Partial<SaveDataV10>): saveData is SaveDataV10 {
  return saveData.version === 10 && Boolean(saveData.game);
}

function isSaveDataV11(saveData: Partial<SaveDataV11>): saveData is SaveDataV11 {
  return saveData.version === 11 && Boolean(saveData.game);
}

function restoreBailoutState(
  gameData: GameData,
  player: {
    bailoutAccepted?: boolean;
    bailoutOfferAmount?: number;
    bailoutUnlocked?: boolean;
    bailoutPeakMoneySinceDecline?: number;
    bailoutDaysBelowThreshold?: number;
    pendingBailoutOffer?: number | null;
  }
): void {
  const defaults = createInitialBailoutState();
  gameData.player.bailoutAccepted = player.bailoutAccepted === true;
  gameData.player.bailoutOfferAmount = getSafePositiveInteger(
    player.bailoutOfferAmount ?? defaults.bailoutOfferAmount,
    defaults.bailoutOfferAmount
  );
  gameData.player.bailoutPeakMoneySinceDecline = getSafeInteger(
    player.bailoutPeakMoneySinceDecline ?? defaults.bailoutPeakMoneySinceDecline,
    defaults.bailoutPeakMoneySinceDecline
  );
  gameData.player.bailoutDaysBelowThreshold = Math.max(
    0,
    getSafeInteger(
      player.bailoutDaysBelowThreshold ?? defaults.bailoutDaysBelowThreshold,
      defaults.bailoutDaysBelowThreshold
    )
  );

  if (gameData.player.bailoutAccepted) {
    gameData.player.bailoutUnlocked = false;
    gameData.player.pendingBailoutOffer = null;
    return;
  }

  gameData.player.bailoutUnlocked = player.bailoutUnlocked !== false;
  const pending = player.pendingBailoutOffer;
  gameData.player.pendingBailoutOffer = typeof pending === "number" && Number.isInteger(pending) && pending > 0
    ? pending
    : null;
}

function cloneInventory(inventory: PlayerInventory): PlayerInventory {
  return {
    itemStacks: {...inventory.itemStacks},
    equipments: inventory.equipments.map((equipment) => ({
      ...equipment,
      effects: equipment.effects.map((effect) => ({...effect}))
    }))
  };
}

function sanitizeShopPrices(
  shopPrices: Record<string, number> | undefined,
  itemDefinitions: GameData["itemDefinitions"]
): Record<string, number> {
  if (!shopPrices || typeof shopPrices !== "object") {
    return {};
  }

  const knownItemIds = new Set(itemDefinitions.map((item) => item.id));
  return Object.fromEntries(
    Object.entries(shopPrices).filter(([itemId, price]) => {
      return knownItemIds.has(itemId) && Number.isInteger(price) && price >= 1 && price <= 99;
    })
  );
}

function appendMissingConfiguredInitialAdventurers(
  savedAdventurers: SavedAdventurer[],
  configuredInitialAdventurers: SavedAdventurer[]
): SavedAdventurer[] {
  const existingTemplateIds = new Set(savedAdventurers.map((adventurer) => adventurer.templateId ?? adventurer.id));
  const existingInstanceIds = new Set(savedAdventurers.map((adventurer) => adventurer.instanceId));
  const missingAdventurers = configuredInitialAdventurers.filter((adventurer) => {
    const templateId = adventurer.templateId ?? adventurer.id;
    return !existingTemplateIds.has(templateId) && !existingInstanceIds.has(adventurer.instanceId);
  });

  return [...savedAdventurers, ...missingAdventurers];
}

function getNextGeneratedAdventurerCounter(instanceIds: string[]): number {
  const numericIds = instanceIds
    .map((instanceId) => /^generated:(\d+)$/.exec(instanceId)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 1);

  return Math.max(0, ...numericIds, instanceIds.filter((id) => id.startsWith("generated:")).length) + 1;
}
