import {
  adventurerTemplates,
  craftingRecipes,
  dailyNeedsConfig,
  equipmentDefinitions,
  establishment,
  intelDefinitions,
  itemDefinitions,
  marketId,
  marketListings,
  marketPricing,
  namePools,
  playerStarter,
  questEconomyConfig,
  questTemplates,
  resources
} from "./config";
import {createInitialBailoutState} from "./systems/economy/bailout";
import {createEmptyMarketStock} from "./systems/economy/marketStock";
import {createInitialAdventurerInstances} from "./systems/adventurers/adventurerInstances";
import {createEquipmentInstance, createInitialInventoryWithItems} from "./systems/inventory";
import {createStoryEntry} from "./text/storyText";
import type {Elements, GameData} from "./core/types";

// 当前原型的基础常量。
// 这些不是最终经济数值，但至少要集中放在这里，避免散落成来路不明的初始值。
export const LOG_HISTORY_LIMIT = 30;
export const INITIAL_DAY = 1;
export const INITIAL_PLAYER_MONEY = 120;
export const INITIAL_QUEST_ID = 1;
export const INITIAL_ADVENTURER_ID = 1;
export const DAILY_SHOP_INCOME = 2;
export const INITIAL_RESULT_INSIGHT_LEVEL = "basic" as const;

export function createInitialGameData(): GameData {
  const adventurers = createInitialAdventurerInstances(adventurerTemplates, INITIAL_DAY);
  const inventory = createInitialInventoryWithItems(itemDefinitions, equipmentDefinitions);
  Object.entries(playerStarter.itemStacks).forEach(([itemId, amount]) => {
    if (Number.isInteger(amount) && amount > 0) {
      inventory.itemStacks[itemId] = (inventory.itemStacks[itemId] ?? 0) + amount;
    }
  });
  adventurers.forEach((adventurer) => {
    adventurer.startingEquipmentDefinitionIds?.forEach((definitionId, index) => {
      const definition = equipmentDefinitions.find((candidate) => candidate.id === definitionId);
      if (!definition) {
        return;
      }

      const equipment = createEquipmentInstance(
        definition,
        `equipment:${adventurer.id}:${definitionId}:${index + 1}`,
        INITIAL_DAY
      );
      equipment.equippedByAdventurerId = adventurer.id;
      inventory.equipments.push(equipment);
    });
  });

  return {
    day: INITIAL_DAY,
    activeTab: "workbench",
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
      hasGiftedAdventurerItem: false,
      shopPrices: {},
      ...createInitialBailoutState(),
      quests: [],
      stock: Object.fromEntries(resources.map((resource) => [resource.id, 0])),
      inventory,
      leads: [],
      discoveries: []
    },
    questIdCounter: INITIAL_QUEST_ID,
    adventurerIdCounter: INITIAL_ADVENTURER_ID,
    dailyShopIncome: 0,
    establishment,
    marketId,
    marketListings,
    marketStock: createEmptyMarketStock(),
    marketPricing,
    questEconomyConfig,
    craftingRecipes,
    resources,
    itemDefinitions,
    equipmentDefinitions,
    namePools,
    questTemplates,
    intelDefinitions,
    adventurerTemplates,
    adventurers,
    dailyNeedsConfig,
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
    giftModal: null,
    giftContent: null,
    giftCloseBtn: null,
    giftConfirmBtn: null,
    bailoutModal: null,
    bailoutTitle: null,
    bailoutContent: null,
    bailoutAcceptBtn: null,
    bailoutDeclineBtn: null,
    loadoutModal: null,
    loadoutContent: null,
    loadoutCloseBtn: null,
    adventurerDetailModal: null,
    adventurerDetailContent: null,
    adventurerDetailCloseBtn: null,
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
    provisionRationsCheckbox: null,
    rationHint: null,
    nextDayBtn: null,
    tabButtons: [],
    storyRailList: null,
    questList: null,
    adventurerList: null,
    intelList: null,
    stockList: null,
    marketList: null,
    logList: null
  };
}
