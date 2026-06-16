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
export const DAILY_SHOP_INCOME = 6;
export const INITIAL_RESULT_INSIGHT_LEVEL = "basic" as const;

export function createInitialGameData(): GameData {
  const adventurers = createInitialAdventurerInstances(adventurerTemplates, INITIAL_DAY);
  const inventory = createInitialInventoryWithItems(itemDefinitions, equipmentDefinitions);
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
      equipment.customName = getStartingEquipmentCustomName(adventurer.id, definitionId);
      inventory.equipments.push(equipment);
    });
  });

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
      hasGiftedAdventurerItem: false,
      quests: [],
      stock: Object.fromEntries(resources.map((resource) => [resource.id, 0])),
      inventory,
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
    adventurers,
    dayLog: [
      createStoryEntry("opening_day", {day: INITIAL_DAY})
    ]
  };
}

function getStartingEquipmentCustomName(adventurerId: string, definitionId: string): string | null {
  const customNames: Record<string, Record<string, string>> = {
    "handcrafted:demo-full-loadout": {
      "demo-short-sword": "&6&l灰河&7旧誓&c&l短剑",
      "demo-guard-shield": "&9&l旧城&b巡夜&3圆盾",
      "demo-scout-helm": "&5&l有裂纹的&d斥候盔",
      "demo-field-armor": "&e&l褪色的&6远行胸甲",
      "demo-knee-guards": "&a&l补过三次的&2护膝",
      "demo-travel-boots": "&4走过&c北坡&4泥地的&l靴子",
      "demo-copper-ring": "&6&l刻着&e小字的&n铜戒",
      "demo-utility-hook": "&3&l磨亮&b的多用挂钩"
    },
    "handcrafted:demo-trusted-pack": {
      "demo-scout-helm": "借来的轻斥候盔"
    }
  };

  return customNames[adventurerId]?.[definitionId] ?? null;
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
    loadoutModal: null,
    loadoutContent: null,
    loadoutCloseBtn: null,
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
