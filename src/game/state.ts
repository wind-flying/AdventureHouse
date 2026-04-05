import {adventurerTemplates, intelDefinitions, questTemplates, resources} from "./config";
import {createStoryEntry} from "./text/storyText";
import type {AdventurerDiscoveryLevel, Elements, GameData} from "./types";

// 当前原型的基础常量。
// 这些不是最终经济数值，但至少要集中放在这里，避免散落成来路不明的初始值。
export const LOG_HISTORY_LIMIT = 30;
export const INITIAL_DAY = 1;
export const INITIAL_PLAYER_MONEY = 120;
export const INITIAL_QUEST_ID = 1;
export const DAILY_SHOP_INCOME = 6;
export const INITIAL_RESULT_INSIGHT_LEVEL = "basic" as const;

const DISCOVERY_POINTS_BY_LEVEL = {
  heard: 0,
  seen: 1,
  acquainted: 2,
  familiar: 4,
  trusted: 7
} as const;

export function getDiscoveryLevelFromPoints(points: number): AdventurerDiscoveryLevel {
  if (points >= DISCOVERY_POINTS_BY_LEVEL.trusted) {
    return "trusted";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.familiar) {
    return "familiar";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.acquainted) {
    return "acquainted";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.seen) {
    return "seen";
  }

  return "heard";
}

export function createInitialGameData(): GameData {
  return {
    day: INITIAL_DAY,
    activeTab: "overview",
    questFilters: {
      status: "all",
      nature: "all"
    },
    adventurerFilters: {
      level: "all",
      status: "all",
      pinned: "all"
    },
    pinnedAdventurerIds: [],
    player: {
      money: INITIAL_PLAYER_MONEY,
      resultInsightLevel: INITIAL_RESULT_INSIGHT_LEVEL,
      quests: [],
      stock: Object.fromEntries(resources.map((resource) => [resource.id, 0])),
      leads: [],
      discoveries: []
    },
    questIdCounter: INITIAL_QUEST_ID,
    dailyShopIncome: DAILY_SHOP_INCOME,
    resources,
    questTemplates,
    intelDefinitions,
    adventurers: adventurerTemplates.map((adventurer) => ({
      ...adventurer,
      knownLevel: adventurer.knownByDefault ? adventurer.discoveryLevel : "heard",
      acquaintancePoints: adventurer.knownByDefault
        ? DISCOVERY_POINTS_BY_LEVEL[adventurer.discoveryLevel]
        : DISCOVERY_POINTS_BY_LEVEL.heard,
      lastSeenDay: adventurer.knownByDefault ? INITIAL_DAY : null,
      currentQuestId: null
    })),
    dayLog: [
      createStoryEntry("opening_day", {day: INITIAL_DAY})
    ]
  };
}

export function createEmptyElements(): Elements {
  return {
    container: null,
    dayDisplay: null,
    moneyDisplay: null,
    activeQuestDisplay: null,
    stockSummaryDisplay: null,
    knownAdventurerDisplay: null,
    templateSelect: null,
    questStatusFilterSelect: null,
    questNatureFilterSelect: null,
    adventurerLevelFilterSelect: null,
    adventurerStatusFilterSelect: null,
    adventurerPinnedFilterSelect: null,
    rewardInput: null,
    quantityInput: null,
    templateDescription: null,
    durationHint: null,
    createQuestBtn: null,
    nextDayBtn: null,
    tabButtons: [],
    overviewQuestList: null,
    storyRailList: null,
    questList: null,
    adventurerList: null,
    intelList: null,
    stockList: null,
    logList: null
  };
}
