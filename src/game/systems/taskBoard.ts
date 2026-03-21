import {LOG_HISTORY_LIMIT} from "../state";
import {getQuestResourceLabel, getQuestTemplateFocusLabel} from "../ui/resourceDisplay";
import {createStoryEntry} from "../text/storyText";
import {getQuestActionFeedback, getQuestPublishModeText} from "../text/uiText";
import {getUnlockedTemplatesFromQuestResolution} from "./questUnlocks";
import {chooseAdventurerForQuest as chooseAdventurerForQuestByAcceptance} from "./taskAcceptance";
import {getQuestResolutionInput, getQuestSuccessBreakdown} from "./taskResolution";
import type {
  ActionResult,
  Adventurer,
  CreateQuestInput,
  GameData,
  IntelRecord,
  Quest,
  QuestResult,
  QuestResultOutcome,
  StoryEntry,
  QuestTemplate
} from "../types";

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

const ACQUAINTANCE_LEVEL_THRESHOLD = {
  heard: 0,
  seen: 1,
  acquainted: 2,
  familiar: 4,
  trusted: 7
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

function resolveQuestResult(gameData: GameData, quest: Quest): QuestResult {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const resultMode = template?.resultMode ?? "resource";
  const outcome = getQuestOutcome(gameData, quest, template);

  if (outcome === "failure") {
    const failureIntel = getIntelDefinitionById(gameData, template?.failureIntelId);
    return {
      type: failureIntel?.kind ?? (resultMode === "discovery" ? "discovery" : "lead"),
      outcome,
      summary: failureIntel?.content ?? template?.failureIntelSummary ?? `${quest.title} 这次没有带回稳定成果`
    };
  }

  if (resultMode === "lead") {
    const leadIntel = getRandomIntelDefinitionFromPool(gameData, template?.resultIntelPoolIds)
      ?? getIntelDefinitionById(gameData, template?.resultIntelId);
    return {
      type: "lead",
      outcome,
      summary: `获得线索：${leadIntel?.content ?? buildLeadText(quest)}`
    };
  }

  if (resultMode === "discovery") {
    const discoveryIntel = getIntelDefinitionById(gameData, template?.resultIntelId);
    return {
      type: "discovery",
      outcome,
      summary: `获得发现：${discoveryIntel?.content ?? buildDiscoveryText(quest)}`
    };
  }

  return {
    type: "resource",
    outcome,
    summary: `获得 ${quest.quantity} 个 ${getQuestResourceLabel(gameData, quest)}`
  };
}

function applyQuestResult(gameData: GameData, quest: Quest, result: QuestResult, nextDayEntries: StoryEntry[]): void {
  if (result.outcome === "failure") {
    const template = getQuestTemplateById(gameData, quest.templateId);
    const failureIntel = getIntelDefinitionById(gameData, template?.failureIntelId);
    const failureRecord = createIntelRecord(
      gameData,
      quest,
      failureIntel?.kind ?? (result.type === "discovery" ? "discovery" : "lead"),
      failureIntel?.id,
      failureIntel?.title ?? getFallbackIntelTitle(quest, failureIntel?.kind ?? (result.type === "discovery" ? "discovery" : "lead"), true),
      result.summary
    );
    if (failureRecord.kind === "lead") {
      gameData.player.leads.unshift(failureRecord);
    } else {
      gameData.player.discoveries.unshift(failureRecord);
    }
    nextDayEntries.push(
      createStoryEntry("task_failed", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        failureText: failureRecord.summary
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [failureRecord]);
    return;
  }

  if (result.type === "resource") {
    if (!quest.resource) {
      return;
    }

    gameData.player.stock[quest.resource] = (gameData.player.stock[quest.resource] ?? 0) + quest.quantity;
    nextDayEntries.push(
      createStoryEntry("task_completed", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        quantity: quest.quantity,
        resourceLabel: getQuestResourceLabel(gameData, quest)
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, []);
    return;
  }

  if (result.type === "lead") {
    const questTemplate = getQuestTemplateById(gameData, quest.templateId);
    const leadIntel = getRandomIntelDefinitionFromPool(gameData, questTemplate?.resultIntelPoolIds)
      ?? getIntelDefinitionById(gameData, questTemplate?.resultIntelId);
    const leadRecord = createIntelRecord(
      gameData,
      quest,
      "lead",
      leadIntel?.id,
      leadIntel?.title ?? getFallbackIntelTitle(quest, "lead"),
      leadIntel?.content ?? buildLeadText(quest)
    );
    gameData.player.leads.unshift(leadRecord);
    nextDayEntries.push(
      createStoryEntry("task_lead_found", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        leadText: leadRecord.summary
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [leadRecord]);
    return;
  }

  const discoveryIntel = getIntelDefinitionById(gameData, getQuestTemplateById(gameData, quest.templateId)?.resultIntelId);
  const discoveryRecord = createIntelRecord(
    gameData,
    quest,
    "discovery",
    discoveryIntel?.id,
    discoveryIntel?.title ?? getFallbackIntelTitle(quest, "discovery"),
    discoveryIntel?.content ?? buildDiscoveryText(quest)
  );
  gameData.player.discoveries.unshift(discoveryRecord);
  nextDayEntries.push(
    createStoryEntry("task_discovery_made", {
      day: gameData.day,
      questDisplayId: quest.displayId,
      questTitle: quest.title,
      discoveryText: discoveryRecord.summary
    })
  );
  pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [discoveryRecord]);
}

function getQuestOutcome(gameData: GameData, quest: Quest, template: QuestTemplate | undefined): QuestResultOutcome {
  switch (template?.testOutcomeMode) {
    case "failure":
      return "failure";
    case "success":
      return "success";
    case "normal":
    default:
      break;
  }

  if (!template || getQuestPublishMode(template) !== "intel") {
    return "success";
  }

  const successChance = getQuestSuccessChance(gameData, quest, template);
  return Math.random() < successChance ? "success" : "failure";
}

function getQuestSuccessChance(gameData: GameData, quest: Quest, template: QuestTemplate): number {
  const adventurer = getQuestAdventurer(gameData, quest);
  const matchingIntelCount = template.lineId ? getUniqueIntelCountForLine(gameData, template.lineId) : 0;
  return getQuestSuccessBreakdown(
    getQuestResolutionInput(quest, template),
    adventurer,
    matchingIntelCount
  ).finalChance;
}

function getUniqueIntelCountForLine(gameData: GameData, lineId: string): number {
  const intelIds = new Set(
    [...gameData.player.leads, ...gameData.player.discoveries]
      .filter((record) => record.lineId === lineId)
      .map((record) => record.id)
  );

  return intelIds.size;
}

function createIntelRecord(
  gameData: GameData,
  quest: Quest,
  kind: IntelRecord["kind"],
  intelId: string | undefined,
  title: string,
  summary: string
): IntelRecord {
  const intelDefinition = getIntelDefinitionById(gameData, intelId);
  const questTemplate = getQuestTemplateById(gameData, quest.templateId);
  return {
    id: intelId ?? `${quest.templateId}-${kind}-${gameData.day}`,
    kind,
    title,
    day: gameData.day,
    summary,
    lineId: intelDefinition?.lineId ?? questTemplate?.lineId ?? null,
    lineTitle: intelDefinition?.lineTitle ?? questTemplate?.lineTitle ?? null,
    sourceQuestDisplayId: quest.displayId,
    sourceQuestTitle: quest.title,
    sourceTemplateId: quest.templateId,
    sourceOutcome: quest.result?.outcome ?? "success"
  };
}

function getFallbackIntelTitle(
  quest: Quest,
  kind: IntelRecord["kind"],
  isFailure = false
): string {
  if (isFailure) {
    return `${quest.title}后续回报`;
  }

  return kind === "discovery"
    ? `${quest.title}发现记录`
    : `${quest.title}线索记录`;
}

function buildLeadText(quest: Quest): string {
  return `${quest.title} 留下了新的调查方向`;
}

function buildDiscoveryText(quest: Quest): string {
  return `${quest.title} 带回了一条异常发现记录`;
}

function pushUnlockedFollowUpEntries(
  gameData: GameData,
  quest: Quest,
  nextDayEntries: StoryEntry[],
  intelRecords: IntelRecord[]
): void {
  getUnlockedTemplatesFromQuestResolution(gameData, quest, intelRecords).forEach((template) => {
    if (hasQuestTemplateBeenIntroduced(gameData, template.id)) {
      return;
    }

    nextDayEntries.push(
      createStoryEntry("follow_up_unlocked", {
        day: gameData.day,
        sourceQuestDisplayId: quest.displayId,
        sourceQuestTitle: quest.title,
        unlockedTitle: template.title
      })
    );
  });
}

function hasQuestTemplateBeenIntroduced(gameData: GameData, templateId: string): boolean {
  return gameData.player.quests.some((quest) => quest.templateId === templateId);
}

function increaseAcquaintance(adventurer: Adventurer, points: number): void {
  adventurer.acquaintancePoints += points;
  adventurer.knownLevel = getDiscoveryLevelFromPoints(adventurer.acquaintancePoints);
}

function getDiscoveryLevelFromPoints(points: number): Adventurer["knownLevel"] {
  if (points >= ACQUAINTANCE_LEVEL_THRESHOLD.trusted) {
    return "trusted";
  }

  if (points >= ACQUAINTANCE_LEVEL_THRESHOLD.familiar) {
    return "familiar";
  }

  if (points >= ACQUAINTANCE_LEVEL_THRESHOLD.acquainted) {
    return "acquainted";
  }

  if (points >= ACQUAINTANCE_LEVEL_THRESHOLD.seen) {
    return "seen";
  }

  return "heard";
}
