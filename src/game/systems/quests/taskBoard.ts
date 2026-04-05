import {LOG_HISTORY_LIMIT} from "../../state";
import {getQuestResourceLabel, getQuestTemplateFocusLabel} from "../../ui/resourceDisplay";
import {createStoryEntry} from "../../text/storyText";
import {getQuestActionFeedback, getQuestPublishModeText} from "../../text/uiText";
import {getDiscoveryLevelFromPoints} from "../adventurers/adventurerInstances";
import {chooseAdventurerForQuest as chooseAdventurerForQuestByAcceptance} from "./taskAcceptance";
import {applyQuestResult, resolveQuestResult} from "./taskResult";
import type {
  ActionResult,
  Adventurer,
  CreateQuestInput,
  GameData,
  Quest,
  StoryEntry,
  QuestTemplate
} from "../../types";

// 临时规则参数：控制任务推荐报酬和耗时估算。
// 后续如果要做更细的经济系统或任务特征模型，这一组应优先被替换或配置化。
const QUEST_RULE_TUNING = {
  // 没有模板时的最低推荐报酬与数量倍率。
  fallbackReward: {
    minimum: 2,
    perUnitMultiplier: 2
  },
  // 固定耗时任务至少要消耗 1 天。
  fixedDurationMinimum: 1,
  // 简单 / 中等 / 困难任务对应的基础耗时偏移。
  // 值越高，该难度任务的预估天数越长。
  difficultyOffset: {
    easy: 0,
    medium: 1,
    hard: 2
  },
  // 所有任务默认至少有 1 天基础耗时。
  baseDurationDays: 1,
  // 数量额外增加耗时的步长。值越大，数量对耗时的放大越慢。
  quantityDurationStep: 2
} as const;

export function getQuestTemplateById(gameData: GameData, templateId: string): QuestTemplate | undefined {
  return gameData.questTemplates.find((template) => template.id === templateId);
}

export function getIntelDefinitionById(gameData: GameData, intelId: string | undefined) {
  if (!intelId) {
    return undefined;
  }

  return gameData.intelDefinitions.find((intel) => intel.id === intelId);
}

function getRandomIntelDefinitionFromPool(gameData: GameData, intelIds: string[] | undefined) {
  if (!intelIds || intelIds.length === 0) {
    return undefined;
  }

  const availableIntel = intelIds
    .map((intelId) => getIntelDefinitionById(gameData, intelId))
    .filter((intel): intel is NonNullable<typeof intel> => Boolean(intel));

  if (availableIntel.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * availableIntel.length);
  return availableIntel[index];
}

export function getQuestPublishMode(template: QuestTemplate | undefined): "stock" | "intel" {
  if (!template) {
    return "stock";
  }

  return template.publishMode ?? (template.nature === "investigation" || template.nature === "mysterious" ? "intel" : "stock");
}

export function isQuestTemplatePublicationBlocked(gameData: GameData, templateId: string): boolean {
  const template = getQuestTemplateById(gameData, templateId);
  if (!template) {
    return false;
  }

  if (template.publicationMode !== "uniqueWhileOpen") {
    return false;
  }

  return hasOpenQuestFromTemplate(gameData, template.id);
}

export function getRecommendedRewardForTemplate(gameData: GameData, templateId: string, quantity: number): number {
  const template = getQuestTemplateById(gameData, templateId);
  if (!template) {
    return Math.max(
      QUEST_RULE_TUNING.fallbackReward.minimum,
      quantity * QUEST_RULE_TUNING.fallbackReward.perUnitMultiplier
    );
  }

  const averageReward = Math.round((template.minReward + template.maxReward) / 2);
  return Math.max(1, averageReward * quantity);
}

export function getEstimatedDaysForTemplate(gameData: GameData, templateId: string, quantity: number): number {
  const template = getQuestTemplateById(gameData, templateId);
  if (template?.timingMode === "fixed") {
    return Math.max(
      QUEST_RULE_TUNING.fixedDurationMinimum,
      template.fixedDurationDays ?? QUEST_RULE_TUNING.fixedDurationMinimum
    );
  }

  const baseDays = template
    ? QUEST_RULE_TUNING.baseDurationDays + QUEST_RULE_TUNING.difficultyOffset[template.difficulty]
    : QUEST_RULE_TUNING.baseDurationDays;

  return baseDays + Math.floor((quantity - 1) / QUEST_RULE_TUNING.quantityDurationStep);
}

export function createQuest(gameData: GameData, input: CreateQuestInput): ActionResult {
  const {templateId, reward} = input;

  if (Number.isNaN(reward) || reward < 1) {
    return {...getQuestActionFeedback("invalidReward", "error"), ok: false};
  }

  const template = getQuestTemplateById(gameData, templateId);
  if (!template) {
    return {...getQuestActionFeedback("missingTemplateConfig", "error"), ok: false};
  }

  const quantity = getQuestPublishMode(template) === "intel" ? 1 : input.quantity;

  if (Number.isNaN(quantity) || quantity < 1) {
    return {...getQuestActionFeedback("invalidQuantity", "error"), ok: false};
  }

  if (gameData.player.money < reward) {
    return {...getQuestActionFeedback("insufficientMoney", "error"), ok: false};
  }

  if (template.publicationMode === "uniqueWhileOpen" && hasOpenQuestFromTemplate(gameData, template.id)) {
    return {...getQuestActionFeedback("duplicateUniqueQuest", "error"), ok: false};
  }

  const estimatedDays = getEstimatedDaysForTemplate(gameData, templateId, quantity);
  const displayId = createDailyDisplayId(gameData, gameData.day);
  const publishMode = getQuestPublishMode(template);
  const focusLabel = getQuestTemplateFocusLabel(gameData, template);
  const targetText = publishMode === "intel" ? focusLabel : `${quantity} 个 ${focusLabel}`;

  const newQuest: Quest = {
    id: gameData.questIdCounter++,
    category: "daily",
    templateId: template.id,
    title: template.title,
    description: template.description,
    contentStageTag: template.contentStageTag,
    designerNote: template.designerNote,
    followUpStageTag: template.followUpStageTag,
    risk: template.risk,
    nature: template.nature,
    displayId,
    resource: template.resource ?? null,
    focusText: template.focusText ?? null,
    reward,
    quantity,
    status: "pending",
    createdDay: gameData.day,
    acceptedDay: null,
    completedDay: null,
    totalDays: estimatedDays,
    daysRemaining: estimatedDays,
    adventurerId: null,
    adventurerName: null,
    result: null
  };

  gameData.player.money -= reward;
  gameData.player.quests.unshift(newQuest);
  prependLog(
    gameData,
    createStoryEntry("task_created", {
      day: gameData.day,
      targetText,
      publishModeText: getQuestPublishModeText(publishMode),
      reward
    })
  );

  return {...getQuestActionFeedback("questCreated", "success"), ok: true};
}

function hasOpenQuestFromTemplate(gameData: GameData, templateId: string): boolean {
  return gameData.player.quests.some((quest) => {
    return quest.templateId === templateId && (quest.status === "pending" || quest.status === "active");
  });
}

export function advanceQuestBoard(gameData: GameData, nextDayEntries: StoryEntry[]): void {
  gameData.player.quests.forEach((quest) => {
    if (quest.status === "completed") {
      return;
    }

    if (quest.status === "pending") {
      const adventurer = chooseAdventurerForQuest(gameData, quest);
      if (!adventurer) {
        return;
      }

      quest.status = "active";
      quest.acceptedDay = gameData.day;
      quest.adventurerId = adventurer.id;
      quest.adventurerName = adventurer.name;
      adventurer.currentQuestId = quest.id;
      adventurer.lastSeenDay = gameData.day;
      increaseAcquaintance(adventurer, 1);

      nextDayEntries.push(
        createStoryEntry("task_started", {
          day: gameData.day,
          questDisplayId: quest.displayId,
          questTitle: quest.title,
          adventurerName: adventurer.name,
          targetText: getQuestResourceLabel(gameData, quest)
        })
      );
      return;
    }

    quest.daysRemaining -= 1;

    if (quest.daysRemaining <= 0) {
      quest.status = "completed";
      quest.completedDay = gameData.day;

      const adventurer = getQuestAdventurer(gameData, quest);
      if (adventurer) {
        adventurer.currentQuestId = null;
        adventurer.lastSeenDay = gameData.day;
        increaseAcquaintance(adventurer, 1);
      }

      const result = resolveQuestResult(gameData, quest);
      quest.result = result;
      applyQuestResult(gameData, quest, result, nextDayEntries);
      return;
    }

    nextDayEntries.push(
      createStoryEntry("task_progress", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        daysRemaining: quest.daysRemaining
      })
    );
  });
}

export function getQuestDisplayIdByInternalId(gameData: GameData, questId: number | null): string | null {
  if (questId === null) {
    return null;
  }

  return gameData.player.quests.find((quest) => quest.id === questId)?.displayId ?? null;
}

function prependLog(gameData: GameData, entry: StoryEntry): void {
  gameData.dayLog = [entry, ...gameData.dayLog].slice(0, LOG_HISTORY_LIMIT);
}

function createDailyDisplayId(gameData: GameData, day: number): string {
  const dailyCountForDay = gameData.player.quests.filter(
    (quest) => quest.category === "daily" && quest.createdDay === day
  ).length;

  return `D${day}-${dailyCountForDay + 1}`;
}

function chooseAdventurerForQuest(gameData: GameData, quest: Quest): Adventurer | null {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const availableAdventurers = gameData.adventurers.filter((adventurer) => adventurer.currentQuestId === null);
  return chooseAdventurerForQuestByAcceptance(gameData, quest, template, availableAdventurers);
}

function getQuestAdventurer(gameData: GameData, quest: Quest): Adventurer | undefined {
  if (!quest.adventurerId) {
    return undefined;
  }

  return gameData.adventurers.find((adventurer) => adventurer.id === quest.adventurerId);
}

function increaseAcquaintance(adventurer: Adventurer, points: number): void {
  adventurer.acquaintancePoints += points;
  adventurer.knownLevel = getDiscoveryLevelFromPoints(adventurer.acquaintancePoints);
}
