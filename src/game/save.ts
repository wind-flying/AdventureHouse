import {createInitialGameData, INITIAL_DAY, LOG_HISTORY_LIMIT} from "./state";
import {
  createInitialAdventurerInstances,
  restoreAdventurerInstance,
  restoreLegacySavedAdventurer,
  restoreLegacyAdventurerState,
} from "./systems/adventurers/adventurerInstances";
import {restoreQuestResult, toSavedQuestResult} from "./systems/quests/taskResult";
import {createEmptyInventory, sanitizeInventory} from "./systems/inventory";
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
  SavedAdventurer,
  SavedQuest,
  StoryEntry
} from "./core/types";

const SAVE_STORAGE_KEY = "adventure-house.save";
// 只在持久化结构真正变化时才升级版本。
// 开发阶段的内部重构、公式细调、文案修改不应机械地增加存档版本。
export const SAVE_FORMAT_VERSION = 7 as const;

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

function createSaveData(gameData: GameData): SaveDataV7 {
  return {
    version: SAVE_FORMAT_VERSION,
    game: {
      day: gameData.day,
      questIdCounter: gameData.questIdCounter,
      adventurerIdCounter: gameData.adventurerIdCounter,
      pinnedAdventurerIds: [...gameData.pinnedAdventurerIds],
      player: {
        money: gameData.player.money,
        resultInsightLevel: gameData.player.resultInsightLevel,
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

function restoreGameDataFromSave(saveData: SaveDataV7): GameData {
  const gameData = createInitialGameData();

  gameData.day = getSafePositiveInteger(saveData.game.day, INITIAL_DAY);
  gameData.questIdCounter = getSafePositiveInteger(saveData.game.questIdCounter, gameData.questIdCounter);
  gameData.adventurerIdCounter = getSafePositiveInteger(
    saveData.game.adventurerIdCounter,
    gameData.adventurerIdCounter
  );

  gameData.player.money = getSafeInteger(saveData.game.player.money, gameData.player.money);
  gameData.player.resultInsightLevel = sanitizeResultInsightLevel(saveData.game.player.resultInsightLevel);
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
  gameData.dayLog = sanitizeStoryEntries(saveData.game.dayLog);

  gameData.adventurers = saveData.game.adventurers.map((savedAdventurer) => {
    return restoreAdventurerInstance(gameData.adventurerTemplates, savedAdventurer);
  });
  gameData.pinnedAdventurerIds = saveData.game.pinnedAdventurerIds.filter((id) => {
    return gameData.adventurers.some((adventurer) => adventurer.instanceId === id);
  });

  gameData.player.quests = saveData.game.player.quests.map((savedQuest) => {
    const quest: Quest = {
      ...savedQuest,
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

function migrateSaveData(rawSave: unknown): SaveDataV7 | null {
  if (!rawSave || typeof rawSave !== "object") {
    return null;
  }

  const candidate = rawSave as Partial<SaveDataV1 | SaveDataV2 | SaveDataV3 | SaveDataV4 | SaveDataV5 | SaveDataV6 | SaveDataV7>;
  switch (candidate.version) {
    case 1:
      return isSaveDataV1(candidate)
        ? migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(migrateSaveDataV2ToV3(migrateSaveDataV1ToV2(candidate))))))
        : null;
    case 2:
      return isSaveDataV2(candidate)
        ? migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(migrateSaveDataV2ToV3(candidate)))))
        : null;
    case 3:
      return isSaveDataV3(candidate) ? migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(migrateSaveDataV3ToV4(candidate)))) : null;
    case 4:
      return isSaveDataV4(candidate) ? migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(migrateSaveDataV4ToV5(candidate))) : null;
    case 5:
      return isSaveDataV5(candidate) ? migrateSaveDataV6ToV7(migrateSaveDataV5ToV6(candidate)) : null;
    case 6:
      return isSaveDataV6(candidate) ? migrateSaveDataV6ToV7(candidate) : null;
    case SAVE_FORMAT_VERSION:
      return isSaveDataV7(candidate) ? candidate : null;
    default:
      return null;
  }
}

type SaveDataCandidate = Partial<SaveDataV1 | SaveDataV2 | SaveDataV3 | SaveDataV4 | SaveDataV5 | SaveDataV6 | SaveDataV7>;

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
        giftedItems: adventurer.giftedItems ?? []
      }))
    }
  };
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

function getNextGeneratedAdventurerCounter(instanceIds: string[]): number {
  const numericIds = instanceIds
    .map((instanceId) => /^generated:(\d+)$/.exec(instanceId)?.[1] ?? null)
    .filter((value): value is string => value !== null)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 1);

  return Math.max(0, ...numericIds, instanceIds.filter((id) => id.startsWith("generated:")).length) + 1;
}
