import {createInitialGameData, INITIAL_DAY, LOG_HISTORY_LIMIT} from "./state";
import {createInitialAdventurerInstances, restoreAdventurerInstance, restoreLegacyAdventurerState} from "./systems/adventurers/adventurerInstances";
import {restoreQuestResult, toSavedQuestResult} from "./systems/quests/taskResult";
import type {
  GameData,
  Quest,
  ResultInsightLevel,
  SaveDataV1,
  SaveDataV2,
  SavedAdventurer,
  SavedQuest,
  StoryEntry
} from "./types";

const SAVE_STORAGE_KEY = "adventure-house.save";
const SAVE_FORMAT_VERSION = 2 as const;

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

function createSaveData(gameData: GameData): SaveDataV2 {
  return {
    version: SAVE_FORMAT_VERSION,
    game: {
      day: gameData.day,
      questIdCounter: gameData.questIdCounter,
      pinnedAdventurerIds: [...gameData.pinnedAdventurerIds],
      player: {
        money: gameData.player.money,
        resultInsightLevel: gameData.player.resultInsightLevel,
        quests: gameData.player.quests.map((quest) => createSavedQuest(quest)),
        stock: Object.fromEntries(
          Object.entries(gameData.player.stock).filter(([, amount]) => amount > 0)
        ),
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

function restoreGameDataFromSave(saveData: SaveDataV2): GameData {
  const gameData = createInitialGameData();

  gameData.day = getSafePositiveInteger(saveData.game.day, INITIAL_DAY);
  gameData.questIdCounter = getSafePositiveInteger(saveData.game.questIdCounter, gameData.questIdCounter);
  gameData.pinnedAdventurerIds = saveData.game.pinnedAdventurerIds.filter((id) => {
    return gameData.adventurers.some((adventurer) => adventurer.id === id);
  });

  gameData.player.money = getSafeInteger(saveData.game.player.money, gameData.player.money);
  gameData.player.resultInsightLevel = sanitizeResultInsightLevel(saveData.game.player.resultInsightLevel);
  const restoredStock: Record<string, number> = {...gameData.player.stock};
  Object.entries(saveData.game.player.stock).forEach(([resourceId, amount]) => {
    if (resourceId in restoredStock && typeof amount === "number" && amount >= 0) {
      restoredStock[resourceId] = amount;
    }
  });
  gameData.player.stock = restoredStock;
  gameData.player.leads = saveData.game.player.leads.map((record) => ({...record}));
  gameData.player.discoveries = saveData.game.player.discoveries.map((record) => ({...record}));
  gameData.dayLog = sanitizeStoryEntries(saveData.game.dayLog);

  gameData.adventurers = saveData.game.adventurers.map((savedAdventurer) => {
    return restoreAdventurerInstance(gameData.adventurerTemplates, savedAdventurer);
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

function migrateSaveData(rawSave: unknown): SaveDataV2 | null {
  if (!rawSave || typeof rawSave !== "object") {
    return null;
  }

  const candidate = rawSave as Partial<SaveDataV1 | SaveDataV2>;
  switch (candidate.version) {
    case 1:
      return isSaveDataV1(candidate) ? migrateSaveDataV1ToV2(candidate) : null;
    case SAVE_FORMAT_VERSION:
      return isSaveDataV2(candidate) ? candidate : null;
    default:
      return null;
  }
}

function isSaveDataV1(candidate: Partial<SaveDataV1 | SaveDataV2>): candidate is SaveDataV1 {
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

function isSaveDataV2(candidate: Partial<SaveDataV1 | SaveDataV2>): candidate is SaveDataV2 {
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
        const legacyState = legacyStateMap.get(adventurer.id);
        return restoreLegacyAdventurerState(adventurer, legacyState ?? null);
      })
    }
  };
}
