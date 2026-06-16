import {
  adventurerTemplates,
  equipmentDefinitions,
  intelDefinitions,
  itemDefinitions,
  namePools,
  questTemplates,
  resources
} from "./config";
import {createInitialAdventurerInstances} from "./systems/adventurers/adventurerInstances";
import {createInitialInventoryWithItems} from "./systems/inventory";
import {createStoryEntry} from "./text/storyText";
import type {Elements, GameData} from "./core/types";

// 当前原型的基础常量。
// 这些不是最终经济数值，但至少要集中放在这里，避免散落成来路不明的初始值。
export const LOG_HISTORY_LIMIT = 30;
export const INITIAL_DAY = 1;
export const INITIAL_PLAYER_MONEY = 120;
export const INITIAL_QUEST_ID = 1;
export const INITIAL_ADVENTURER_ID = 1;
export const DAILY_SHOP_INCOME = 6;
export const INITIAL_RESULT_INSIGHT_LEVEL = "basic" as const;

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
      inventory: createInitialInventoryWithItems(itemDefinitions, equipmentDefinitions),
      leads: [],
      discoveries: []
    },
    questIdCounter: INITIAL_QUEST_ID,
    adventurerIdCounter: INITIAL_ADVENTURER_ID,
    dailyShopIncome: DAILY_SHOP_INCOME,
    resources,
    itemDefinitions,
    equipmentDefinitions,
    namePools,
    questTemplates,
    intelDefinitions,
    adventurerTemplates,
    adventurers: createInitialAdventurerInstances(adventurerTemplates, INITIAL_DAY),
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
    knownAdventurerDisplay: null,
    encyclopediaButton: null,
    encyclopediaModal: null,
    encyclopediaCloseBtn: null,
    encyclopediaNavigation: null,
    encyclopediaContent: null,
    exportSaveBtn: null,
    importSaveBtn: null,
    resetSaveBtn: null,
    importSaveInput: null,
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
