import type {ActionResult, Adventurer, GameData, QuestTemplate} from "../../core/types";
import {
  createQuest,
  getEstimatedDaysForTemplate,
  getQuestDisplayIdByInternalId,
  getQuestPublishMode,
  getQuestTemplateById,
  getRecommendedRewardForTemplate,
  isQuestTemplatePublicationBlocked
} from "../../systems/quests/taskBoard";
import {getDefaultStockQuestQuantity} from "../../systems/quests/questEconomy";
import {getVisibleQuestTemplates} from "../../systems/quests/questVisibility";
import {isNutritionIngredient} from "../../systems/adventurers/dailyNeeds";
import {getLatestDayEntries} from "../../systems/dayLoop";
import {getResourceName} from "../resourceDisplay";
import {getKnownAdventurers} from "../viewModels";
import {uiLabels} from "../../text/uiLabels";
import {getAdventurerCurrentStatusText} from "../../text/uiText";

const OPENING_WEEK_LAST_DAY = 7;
const RESTOCK_TARGET = 2;
const STABLE_MEAL_TARGET = 3;
const OPENING_KITCHEN_RESOURCES = ["rice", "greens"] as const;
const STOCK_RESOURCE_PRIORITY = ["greens", "rice", "wheat", "salt", "mutton"];

export interface Act1TodayGoalViewModel {
  phaseTitle: string;
  goalTitle: string;
  progressText: string;
  suggestionText: string;
}

export interface Act1QuickStockViewModel {
  templateId: string | null;
  title: string;
  summary: string;
  costText: string;
  canPost: boolean;
  ctaLabel: string;
  disabledReason: string | null;
  quantity: number;
  reward: number;
}

export interface Act1StoryHintViewModel {
  nodeTitle: string;
  hintText: string;
}

export interface InTownAdventurerChipViewModel {
  id: string;
  name: string;
  statusText: string;
  statusClass: string;
}

export function getAct1TodayGoalViewModel(gameData: GameData): Act1TodayGoalViewModel {
  const kitchenLine = formatKitchenStockLine(gameData);
  const successfulRestocks = countSuccessfulStockQuests(gameData);
  const stableMealDays = getStableMealDays(gameData);
  const recommended = getRecommendedStockTemplate(gameData);
  const openRecommended = recommended ? getOpenQuestForTemplate(gameData, recommended.id) : null;
  const kitchenTight = isKitchenTight(gameData);
  const openingWeek = gameData.day <= OPENING_WEEK_LAST_DAY;
  const progressText = [
    kitchenLine,
    `${uiLabels.workbench.restockProgress} ${successfulRestocks}/${RESTOCK_TARGET}`,
    `${uiLabels.workbench.stableMeals} ${Math.min(stableMealDays, STABLE_MEAL_TARGET)}/${STABLE_MEAL_TARGET} ${uiLabels.questCard.daySuffix}`
  ].join(" · ");

  if (openRecommended) {
    return {
      phaseTitle: openingWeek ? uiLabels.workbench.openingWeek : uiLabels.workbench.act1Phase,
      goalTitle: uiLabels.workbench.goalWaitingRestock,
      progressText,
      suggestionText: `${uiLabels.workbench.waitingFor} ${recommended?.shortTitle ?? recommended?.title ?? ""}`
    };
  }

  if (kitchenTight && recommended) {
    const resourceName = recommended.resource
      ? getResourceName(gameData, recommended.resource)
      : (recommended.shortTitle ?? recommended.title);
    return {
      phaseTitle: openingWeek ? uiLabels.workbench.openingWeek : uiLabels.workbench.act1Phase,
      goalTitle: `${uiLabels.workbench.goalKitchenTight}${resourceName}`,
      progressText,
      suggestionText: `${uiLabels.workbench.suggestPost}${recommended.shortTitle ?? recommended.title}`
    };
  }

  if (openingWeek && successfulRestocks < RESTOCK_TARGET) {
    return {
      phaseTitle: uiLabels.workbench.openingWeek,
      goalTitle: uiLabels.workbench.goalKeepKitchen,
      progressText,
      suggestionText: recommended
        ? `${uiLabels.workbench.suggestPost}${recommended.shortTitle ?? recommended.title}`
        : uiLabels.workbench.suggestAdvanceDay
    };
  }

  return {
    phaseTitle: openingWeek ? uiLabels.workbench.openingWeek : uiLabels.workbench.act1Phase,
    goalTitle: uiLabels.workbench.goalListenPeople,
    progressText,
    suggestionText: uiLabels.workbench.suggestSeePeople
  };
}

export function getAct1QuickStockViewModel(gameData: GameData): Act1QuickStockViewModel {
  const template = getRecommendedStockTemplate(gameData);
  if (!template) {
    return {
      templateId: null,
      title: uiLabels.workbench.quickPostTitle,
      summary: uiLabels.workbench.noStockQuest,
      costText: "",
      canPost: false,
      ctaLabel: uiLabels.workbench.postCta,
      disabledReason: uiLabels.workbench.noStockQuest,
      quantity: 0,
      reward: 0
    };
  }

  const quantity = getDefaultStockQuestQuantity(gameData, template);
  const reward = getRecommendedRewardForTemplate(gameData, template.id, quantity);
  const estimatedDays = getEstimatedDaysForTemplate(gameData, template.id, quantity);
  const resourceName = template.resource ? getResourceName(gameData, template.resource) : template.title;
  const blocked = isQuestTemplatePublicationBlocked(gameData, template.id);
  const alreadyOpen = getOpenQuestForTemplate(gameData, template.id) !== null;
  const insufficientMoney = gameData.player.money < reward;
  const shortTitle = template.shortTitle ?? template.title;
  const canPost = !blocked && !alreadyOpen && !insufficientMoney;
  const disabledReason = alreadyOpen
    ? uiLabels.workbench.alreadyPosted
    : blocked
      ? uiLabels.workbench.questBlocked
      : insufficientMoney
        ? uiLabels.workbench.insufficientMoney
        : null;

  return {
    templateId: template.id,
    title: uiLabels.workbench.quickPostTitle,
    summary: template.description,
    costText: uiLabels.workbench.costLine(shortTitle, reward, quantity, resourceName, estimatedDays),
    canPost,
    ctaLabel: alreadyOpen ? uiLabels.workbench.waitingCta : uiLabels.workbench.postCtaWithName(shortTitle),
    disabledReason,
    quantity,
    reward
  };
}

export function createRecommendedStockQuest(gameData: GameData): ActionResult {
  const quick = getAct1QuickStockViewModel(gameData);
  if (!quick.templateId || !quick.canPost) {
    return {
      ok: false,
      message: quick.disabledReason ?? uiLabels.workbench.noStockQuest,
      type: "error"
    };
  }

  return createQuest(gameData, {
    templateId: quick.templateId,
    reward: quick.reward,
    quantity: quick.quantity
  });
}

export function getAct1StoryHintViewModel(gameData: GameData): Act1StoryHintViewModel {
  const recommended = getRecommendedStockTemplate(gameData);
  const kitchenTight = isKitchenTight(gameData);
  const waiting = recommended ? getOpenQuestForTemplate(gameData, recommended.id) !== null : false;
  const latest = getLatestDayEntries(gameData)[0];
  const nodeTitle = getCurrentActNodeTitle(gameData);
  if (kitchenTight) {
    return {
      nodeTitle,
      hintText: uiLabels.workbench.storyHintKitchen
    };
  }
  if (waiting) {
    return {
      nodeTitle,
      hintText: uiLabels.workbench.storyHintWaiting
    };
  }
  return {
    nodeTitle,
    hintText: latest?.text ?? uiLabels.workbench.storyHintDefault
  };
}

export function getInTownAdventurerChips(gameData: GameData): InTownAdventurerChipViewModel[] {
  return getInTownAdventurers(gameData).map((adventurer) => {
    const currentQuest = adventurer.currentQuestId === null
      ? null
      : gameData.player.quests.find((quest) => quest.id === adventurer.currentQuestId) ?? null;
    const currentQuestDisplayId = getQuestDisplayIdByInternalId(gameData, adventurer.currentQuestId);
    const away = adventurer.currentQuestId !== null;
    return {
      id: adventurer.id,
      name: adventurer.name,
      statusText: adventurer.foodDeficitStreak > 0
        ? uiLabels.workbench.hungryStatus
        : away
          ? getAdventurerCurrentStatusText(currentQuestDisplayId, currentQuest?.title ?? null)
          : uiLabels.workbench.inTownStatus,
      statusClass: adventurer.foodDeficitStreak > 0 ? "hungry" : away ? "away" : "idle"
    };
  });
}

export function getInTownAdventurers(gameData: GameData): Adventurer[] {
  return getKnownAdventurers(gameData).filter((adventurer) => adventurer.currentQuestId === null);
}

export function findKnownAdventurer(gameData: GameData, adventurerId: string): Adventurer | null {
  return getKnownAdventurers(gameData).find((adventurer) => adventurer.id === adventurerId) ?? null;
}

function getRecommendedStockTemplate(gameData: GameData): QuestTemplate | undefined {
  const stockTemplates = getVisibleQuestTemplates(gameData).filter((template) => {
    return getQuestPublishMode(template) === "stock" && Boolean(template.resource);
  });
  if (stockTemplates.length === 0) {
    return undefined;
  }

  const ranked = [...stockTemplates].sort((left, right) => {
    const leftOpen = getOpenQuestForTemplate(gameData, left.id) ? 1 : 0;
    const rightOpen = getOpenQuestForTemplate(gameData, right.id) ? 1 : 0;
    if (leftOpen !== rightOpen) {
      return leftOpen - rightOpen;
    }

    const leftStock = gameData.player.stock[left.resource ?? ""] ?? 0;
    const rightStock = gameData.player.stock[right.resource ?? ""] ?? 0;
    if (leftStock !== rightStock) {
      return leftStock - rightStock;
    }

    return getStockResourcePriority(left.resource) - getStockResourcePriority(right.resource);
  });

  return ranked[0];
}

function getStockResourcePriority(resourceId: string | undefined): number {
  const index = STOCK_RESOURCE_PRIORITY.indexOf(resourceId ?? "");
  return index >= 0 ? index : STOCK_RESOURCE_PRIORITY.length;
}

function getOpenQuestForTemplate(gameData: GameData, templateId: string) {
  return gameData.player.quests.find((quest) => {
    return quest.templateId === templateId && (quest.status === "pending" || quest.status === "active");
  }) ?? null;
}

function countSuccessfulStockQuests(gameData: GameData): number {
  return gameData.player.quests.filter((quest) => {
    const template = getQuestTemplateById(gameData, quest.templateId);
    return getQuestPublishMode(template) === "stock"
      && quest.status === "completed"
      && quest.result?.outcome === "success";
  }).length;
}

function getStableMealDays(gameData: GameData): number {
  const inTown = getInTownAdventurers(gameData);
  if (inTown.length === 0) {
    return 0;
  }

  const worstStreak = Math.max(0, ...inTown.map((adventurer) => adventurer.foodDeficitStreak));
  return Math.max(0, gameData.day - worstStreak);
}

function isKitchenTight(gameData: GameData): boolean {
  return OPENING_KITCHEN_RESOURCES.some((resourceId) => (gameData.player.stock[resourceId] ?? 0) <= 0)
    || getKitchenIngredientTotal(gameData) <= 0;
}

function getKitchenIngredientTotal(gameData: GameData): number {
  return gameData.resources.reduce((sum, resource) => {
    if (!isNutritionIngredient(gameData, resource.id)) {
      return sum;
    }
    return sum + (gameData.player.stock[resource.id] ?? 0);
  }, 0);
}

function formatKitchenStockLine(gameData: GameData): string {
  return OPENING_KITCHEN_RESOURCES.map((resourceId) => {
    const name = getResourceName(gameData, resourceId);
    const amount = gameData.player.stock[resourceId] ?? 0;
    return `${name} ${amount}`;
  }).join("、");
}

function getCurrentActNodeTitle(gameData: GameData): string {
  const visible = getVisibleQuestTemplates(gameData);
  const investigation = visible.find((template) => getQuestPublishMode(template) === "intel" && template.lineTitle);
  if (investigation?.lineTitle) {
    return investigation.lineTitle;
  }

  const opening = visible.find((template) => template.lineTitle);
  return opening?.lineTitle ?? uiLabels.workbench.act1Phase;
}
