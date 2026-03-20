import {LOG_HISTORY_LIMIT} from "../state";
import {getQuestResourceLabel, getQuestTemplateFocusLabel} from "../ui/resourceDisplay";
import {createStoryEntry} from "../text/storyText";
import {getQuestActionFeedback, getQuestPublishModeText} from "../text/uiText";
import {getUnlockedTemplatesFromQuestResolution} from "./questUnlocks";
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

// 临时调参区：控制“谁更可能接下任务”。
// 这些值越大，代表对应因素对接任务分数的影响越强。
// 例如 easyTaskBonus 越大，勤勉高的人在简单任务上的得分优势就越明显。
// 当前仍是第一版验证参数，后续可能改成更稳定的任务特征模型或配置数据。
const QUEST_ACCEPTANCE_TUNING = {
  // 基础随机扰动，值越大，说明人物之间即使条件接近也更容易出现随机波动。
  randomVariance: 0.25,
  // 候选窗口，值越大，说明“不是最优但接近最优”的人也更容易进入候选池。
  candidateWindow: 0.75,
  // 逐利人格的报酬基准线。值越高，同样一份报酬看起来就越“不够高”。
  rewardPerDayBaseline: 6,
  // 偏好资源的固定加成。值越高，资源偏好对接任务结果的影响越强。
  preferredResourceBonus: 1.6,
  diligence: {
    // 简单任务对高勤勉人格的吸引力。值越高，勤勉的人越偏向稳定补货类任务。
    easyTaskBonus: 0.8,
    // 非简单任务时，勤勉仍然会提供一点正向影响，但远弱于简单任务。
    nonEasyTaskBonus: 0.25
  },
  courage: {
    // 高危任务对勇敢人格的强加成。值越高，勇敢的人越会主动接真正危险的活。
    dangerousTaskBonus: 0.95,
    // 有风险但未必致命的任务，对勇敢人格仍有正向吸引，但弱于高危任务。
    riskyTaskBonus: 0.45,
    // 安全任务对勇敢人格只造成轻微“无聊感”，不应与害怕高危的排斥对称。
    safeTaskPenalty: -0.08
  },
  // 社交人格的轻微通用加成。值越高，外向的人整体更容易接任务。
  sociabilityFactor: 0.08,
  caution: {
    // 安全任务对审慎人格的加成。值越高，审慎的人越偏向稳妥选择。
    safeTaskBonus: 0.55,
    // 中风险任务对审慎人格的惩罚。绝对值越大，审慎的人越不愿意尝试有风险的活。
    riskyTaskPenalty: -0.42,
    // 高危任务对审慎人格的强惩罚。这里应明显重于“勇敢者觉得低危无聊”的轻惩罚。
    dangerousTaskPenalty: -0.88
  },
  curiosity: {
    // 异常任务对求知人格的强吸引。值越高，爱追新鲜事的人越会主动靠近未知内容。
    mysteriousTaskBonus: 0.95,
    // 调查任务对求知人格的中等吸引，弱于真正异常的内容。
    investigationTaskBonus: 0.62,
    // 日常 / 补货任务对求知人格只保留极轻的影响。
    // 这里故意不做对称惩罚：爱新鲜的人做普通活只是略感无趣，不应等价于厌恶异常的人被迫接怪任务。
    ordinaryTaskWeight: 0.08
  },
  discipline: {
    // 短任务对纪律人格的加成。值越高，守规矩的人越偏向可控、短周期合作。
    shortTaskBonus: 0.35,
    // 长任务时纪律人格仍提供一点稳定性，但影响弱于短任务。
    longTaskBonus: 0.12
  },
  resilience: {
    // 长任务对韧性人格的加成。值越高，能扛的人越不怕拖得久的任务。
    longTaskBonus: 0.2,
    // 短任务时韧性的影响较小，只保留一个轻度加成。
    shortTaskBonus: 0.05
  }
} as const;

// 临时意愿阈值：控制“这个人连考虑都不考虑”的下限。
// 先由人格决定基础高低，再叠加最近是否刚做完任务这类状态修正。
// 值越高，代表人物越挑活；值越低，代表人物越容易进入候选池。
const QUEST_INTEREST_TUNING = {
  // 所有人的基础接活门槛。任务吸引分必须先超过它，人物才会参与竞争。
  baseThreshold: 0.45,
  personality: {
    // 勤勉高的人更容易愿意接活，所以会拉低门槛。
    diligenceThresholdFactor: -0.12,
    // 逐利高的人更容易被任务打动，也会稍微降低门槛。
    greedThresholdFactor: -0.08,
    // 审慎高的人更容易观望，因此会抬高门槛。
    cautionThresholdFactor: 0.1,
    // 社交高的人更容易参与公共事务，门槛略低。
    sociabilityThresholdFactor: -0.05,
    // 纪律高的人更容易保持合作节奏，门槛略低。
    disciplineThresholdFactor: -0.06
  },
  recency: {
    // 刚结束任务的当天，人物更倾向先歇一下，因此门槛明显抬高。
    sameDayFinishedPenalty: 0.55,
    // 前一天刚结束任务，仍有余波，门槛继续偏高。
    oneDayAgoFinishedPenalty: 0.3,
    // 连续闲置几天后，人物会更愿意出门，因此门槛降低。
    idleBonusAfterDays: 2,
    // 闲置加成。值越高，挂板久了的人越容易开始考虑任务。
    idleThresholdReduction: 0.18
  }
} as const;

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
  if (availableAdventurers.length === 0) {
    return null;
  }

  // 测试专用：如果模板指定了接取者，则优先直接让该冒险者接下任务，避免反复等待自然竞争。
  if (template?.forcedAdventurerId) {
    return availableAdventurers.find((adventurer) => adventurer.id === template.forcedAdventurerId) ?? null;
  }

  const weightedAdventurers = availableAdventurers
    .map((adventurer) => {
      const score = getQuestAcceptanceScore(gameData, adventurer, quest);
      const threshold = getQuestInterestThreshold(gameData, adventurer);
      return {
        adventurer,
        score,
        threshold
      };
    })
    .filter(({score, threshold}) => score >= threshold);

  if (weightedAdventurers.length === 0) {
    return null;
  }

  weightedAdventurers.sort((left, right) => right.score - left.score);
  const bestScore = weightedAdventurers[0]?.score ?? 0;
  const candidates = weightedAdventurers.filter(
    ({score}) => score >= bestScore - QUEST_ACCEPTANCE_TUNING.candidateWindow
  );
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index]?.adventurer ?? null;
}

function getQuestAcceptanceScore(gameData: GameData, adventurer: Adventurer, quest: Quest): number {
  const rewardPerDay = quest.reward / Math.max(1, quest.totalDays);
  let score = Math.random() * QUEST_ACCEPTANCE_TUNING.randomVariance;

  if (quest.resource && adventurer.preferences.includes(quest.resource)) {
    score += QUEST_ACCEPTANCE_TUNING.preferredResourceBonus;
  }

  score += adventurer.personality.diligence * (
    quest.nature === "routine" || quest.nature === "supply"
      ? QUEST_ACCEPTANCE_TUNING.diligence.easyTaskBonus
      : QUEST_ACCEPTANCE_TUNING.diligence.nonEasyTaskBonus
  );
  score += adventurer.personality.courage * (
    quest.risk === "dangerous"
      ? QUEST_ACCEPTANCE_TUNING.courage.dangerousTaskBonus
      : quest.risk === "risky" || quest.totalDays >= 4
        ? QUEST_ACCEPTANCE_TUNING.courage.riskyTaskBonus
        : QUEST_ACCEPTANCE_TUNING.courage.safeTaskPenalty
  );
  score += adventurer.personality.greed * normalizeValue(
    rewardPerDay / QUEST_ACCEPTANCE_TUNING.rewardPerDayBaseline
  );
  score += adventurer.personality.sociability * QUEST_ACCEPTANCE_TUNING.sociabilityFactor;
  score += adventurer.personality.caution * (
    quest.risk === "safe"
      ? QUEST_ACCEPTANCE_TUNING.caution.safeTaskBonus
      : quest.risk === "dangerous"
        ? QUEST_ACCEPTANCE_TUNING.caution.dangerousTaskPenalty
        : QUEST_ACCEPTANCE_TUNING.caution.riskyTaskPenalty
  );
  score += adventurer.personality.curiosity * (
    quest.nature === "mysterious"
      ? QUEST_ACCEPTANCE_TUNING.curiosity.mysteriousTaskBonus
      : quest.nature === "investigation"
        ? QUEST_ACCEPTANCE_TUNING.curiosity.investigationTaskBonus
        : QUEST_ACCEPTANCE_TUNING.curiosity.ordinaryTaskWeight
  );
  score += adventurer.personality.discipline * (
    quest.totalDays <= 3
      ? QUEST_ACCEPTANCE_TUNING.discipline.shortTaskBonus
      : QUEST_ACCEPTANCE_TUNING.discipline.longTaskBonus
  );
  score += adventurer.personality.resilience * (
    quest.totalDays >= 3
      ? QUEST_ACCEPTANCE_TUNING.resilience.longTaskBonus
      : QUEST_ACCEPTANCE_TUNING.resilience.shortTaskBonus
  );

  return score;
}

function getQuestInterestThreshold(gameData: GameData, adventurer: Adventurer): number {
  let threshold = QUEST_INTEREST_TUNING.baseThreshold;

  threshold += adventurer.personality.diligence * QUEST_INTEREST_TUNING.personality.diligenceThresholdFactor;
  threshold += adventurer.personality.greed * QUEST_INTEREST_TUNING.personality.greedThresholdFactor;
  threshold += adventurer.personality.caution * QUEST_INTEREST_TUNING.personality.cautionThresholdFactor;
  threshold += adventurer.personality.sociability * QUEST_INTEREST_TUNING.personality.sociabilityThresholdFactor;
  threshold += adventurer.personality.discipline * QUEST_INTEREST_TUNING.personality.disciplineThresholdFactor;

  const latestQuestDay = getLatestQuestActivityDay(gameData, adventurer);
  if (latestQuestDay !== null) {
    const daysSinceLastQuest = gameData.day - latestQuestDay;

    if (daysSinceLastQuest <= 0) {
      threshold += QUEST_INTEREST_TUNING.recency.sameDayFinishedPenalty;
    } else if (daysSinceLastQuest === 1) {
      threshold += QUEST_INTEREST_TUNING.recency.oneDayAgoFinishedPenalty;
    } else if (daysSinceLastQuest >= QUEST_INTEREST_TUNING.recency.idleBonusAfterDays) {
      threshold -= QUEST_INTEREST_TUNING.recency.idleThresholdReduction;
    }
  }

  return threshold;
}

function normalizeValue(value: number): number {
  return Math.max(-1, Math.min(1, value - 1));
}

function getQuestAdventurer(gameData: GameData, quest: Quest): Adventurer | undefined {
  if (!quest.adventurerId) {
    return undefined;
  }

  return gameData.adventurers.find((adventurer) => adventurer.id === quest.adventurerId);
}

function getLatestQuestActivityDay(gameData: GameData, adventurer: Adventurer): number | null {
  let latestDay: number | null = null;

  gameData.player.quests.forEach((quest) => {
    if (quest.adventurerId !== adventurer.id) {
      return;
    }

    if (quest.completedDay !== null && (latestDay === null || quest.completedDay > latestDay)) {
      latestDay = quest.completedDay;
      return;
    }

    if (quest.acceptedDay !== null && (latestDay === null || quest.acceptedDay > latestDay)) {
      latestDay = quest.acceptedDay;
    }
  });

  return latestDay;
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
