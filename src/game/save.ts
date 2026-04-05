import {createInitialGameData, getDiscoveryLevelFromPoints, INITIAL_DAY, LOG_HISTORY_LIMIT} from "./state";
import {restoreQuestResult, toSavedQuestResult} from "./systems/taskResult";
import type {
  GameData,
  Quest,
  ResultInsightLevel,
  SaveDataV1,
  SavedAdventurerState,
  SavedQuest,
  StoryEntry
} from "./types";

const SAVE_STORAGE_KEY = "adventure-house.save";
const SAVE_FORMAT_VERSION = 1 as const;

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

function createSaveData(gameData: GameData): SaveDataV1 {
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
      adventurers: gameData.adventurers.map((adventurer): SavedAdventurerState => ({
        id: adventurer.id,
        acquaintancePoints: adventurer.acquaintancePoints,
        lastSeenDay: adventurer.lastSeenDay,
        currentQuestId: adventurer.currentQuestId
      })),
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

function restoreGameDataFromSave(saveData: SaveDataV1): GameData {
  const gameData = createInitialGameData();

  gameData.day = getSafePositiveInteger(saveData.game.day, INITIAL_DAY);
  gameData.questIdCounter = getSafePositiveInteger(saveData.game.questIdCounter, gameData.questIdCounter);
  gameData.pinnedAdventurerIds = saveData.game.pinnedAdventurerIds.filter((id) => {
    return gameData.adventurers.some((adventurer) => adventurer.id === id);
  });

  gameData.player.money = getSafeInteger(saveData.game.player.money, gameData.player.money);
  gameData.player.resultInsightLevel = sanitizeResultInsightLevel(saveData.game.player.resultInsightLevel);
  gameData.player.stock = {
    ...gameData.player.stock,
    ...Object.fromEntries(
      Object.entries(saveData.game.player.stock).filter(([resourceId, amount]) => {
        return resourceId in gameData.player.stock && typeof amount === "number" && amount >= 0;
      })
    )
  };
  gameData.player.leads = saveData.game.player.leads.map((record) => ({...record}));
  gameData.player.discoveries = saveData.game.player.discoveries.map((record) => ({...record}));
  gameData.dayLog = sanitizeStoryEntries(saveData.game.dayLog);

  const savedAdventurerMap = new Map(saveData.game.adventurers.map((adventurer) => [adventurer.id, adventurer]));
  gameData.adventurers = gameData.adventurers.map((adventurer) => {
    const savedAdventurer = savedAdventurerMap.get(adventurer.id);
    if (!savedAdventurer) {
      return adventurer;
    }

    const acquaintancePoints = getSafeInteger(savedAdventurer.acquaintancePoints, adventurer.acquaintancePoints);
    return {
      ...adventurer,
      acquaintancePoints,
      knownLevel: getDiscoveryLevelFromPoints(acquaintancePoints),
      lastSeenDay: getSafeNullableInteger(savedAdventurer.lastSeenDay),
      currentQuestId: getSafeNullableInteger(savedAdventurer.currentQuestId)
    };
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

function migrateSaveData(rawSave: unknown): SaveDataV1 | null {
  if (!rawSave || typeof rawSave !== "object") {
    return null;
  }

  const candidate = rawSave as Partial<SaveDataV1>;
  switch (candidate.version) {
    case SAVE_FORMAT_VERSION:
      return isSaveDataV1(candidate) ? candidate : null;
    default:
      return null;
  }
}

function isSaveDataV1(candidate: Partial<SaveDataV1>): candidate is SaveDataV1 {
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

function getSafeNullableInteger(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value) ? value : null;
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
