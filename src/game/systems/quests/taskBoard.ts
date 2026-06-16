import {LOG_HISTORY_LIMIT} from "../../state";
import {questTextPoolsById} from "../../config";
import {getQuestResourceLabel, getQuestTemplateFocusLabel} from "../../ui/resourceDisplay";
import {createStoryEntry} from "../../text/storyText";
import {getQuestActionFeedback, getQuestPublishModeText} from "../../text/uiText";
import {
  createAdventurerCandidatePreview,
  getAvailableOrdinaryGenerationTemplates,
  getAvailableKnownAdventurers,
  hasAdventurerContactEntry,
  triggerAdventurerContactEvent
} from "../adventurers/adventurerAppearance";
import {getDiscoveryLevelFromPoints} from "../adventurers/adventurerInstances";
import {
  chooseAdventurerForQuest as chooseAdventurerForQuestByAcceptance,
  filterAdventurersForQuestTemplate,
  getQuestAcceptanceBreakdown,
  getQuestInterestBreakdown
} from "./taskAcceptance";
import {applyQuestResult, resolveQuestResult} from "./taskResult";
import type {
  ActionResult,
  Adventurer,
  CreateQuestInput,
  GameData,
  Quest,
  StoryEntry,
  QuestTemplate
} from "../../core/types";

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

const QUEST_TAKER_ROUTING_TUNING = {
  responsiveGate: {
    knownMarginFloor: -0.16,
    hiddenMarginFloor: -0.08
  },
  noTaker: {
    baseWeight: 0.36,
    knownPenaltyPerMargin: 0.2,
    hiddenPenaltyPerMargin: 0.14,
    agePenaltyPerDay: 0.06
  },
  known: {
    baseWeight: 0.5,
    marginWeight: 0.55,
    visibleRosterBonus: 0.06,
    ageBonusPerDay: 0.08
  },
  hidden: {
    baseWeight: 0.24,
    marginWeight: 0.42,
    hiddenRosterBonus: 0.08,
    pendingQuestBonus: 0.06,
    ageBonusPerDay: 0.1
  }
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
  const textSeedKey = `${template.id}:${gameData.day}:${displayId}`;
  const generatedTemplateText = getGeneratedQuestTemplateText(template, textSeedKey);
  const publishMode = getQuestPublishMode(template);
  const focusLabel = generatedTemplateText.focusText ?? getQuestTemplateFocusLabel(gameData, template);
  const targetText = publishMode === "intel" ? focusLabel : `${quantity} 个 ${focusLabel}`;

  const newQuest: Quest = {
    id: gameData.questIdCounter++,
    category: "daily",
    templateId: template.id,
    title: generatedTemplateText.title,
    description: generatedTemplateText.description,
    risk: template.risk,
    nature: template.nature,
    displayId,
    resource: template.resource ?? null,
    focusText: generatedTemplateText.focusText,
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

function getGeneratedQuestTemplateText(
  template: QuestTemplate,
  seedKey: string
): {
  title: string;
  description: string;
  focusText: string | null;
} {
  const textPool = questTextPoolsById[template.textId ?? template.id] ?? {};
  return {
    title: pickFlexibleTextValue(textPool.title, `${seedKey}:title`, template.title),
    description: pickFlexibleTextValue(textPool.description, `${seedKey}:description`, template.description),
    focusText: pickFlexibleTextValue(textPool.focusText, `${seedKey}:focusText`, template.focusText ?? "") || null
  };
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
      const questTaker = chooseQuestTaker(gameData, quest, nextDayEntries);
      if (!questTaker) {
        return;
      }

      let {adventurer} = questTaker;
      const {source} = questTaker;
      if (source === "hidden") {
        const templateId = adventurer.templateId;
        const generatedTemplate = templateId
          ? gameData.adventurerTemplates.find((template) => template.id === templateId)
          : null;
        if (!generatedTemplate) {
          return;
        }

        adventurer = triggerAdventurerContactEvent(
          gameData,
          generatedTemplate,
          nextDayEntries,
          "quest_referral",
          quest
        );
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
  const availableAdventurers = getAvailableKnownAdventurers(gameData);
  return chooseAdventurerForQuestByAcceptance(gameData, quest, template, availableAdventurers);
}

function chooseQuestTaker(
  gameData: GameData,
  quest: Quest,
  nextDayEntries: StoryEntry[]
): {adventurer: Adventurer; source: "known" | "hidden"} | null {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const visibleAdventurers = filterAdventurersForQuestTemplate(
    template,
    getAvailableKnownAdventurers(gameData)
  );
  if (template?.exclusiveTakerTemplateId) {
    const exclusiveTaker = visibleAdventurers[0] ?? null;
    return exclusiveTaker ? {adventurer: exclusiveTaker, source: "known"} : null;
  }

  const hiddenCandidateTemplates = template?.exclusiveTakerTemplateId
    || template?.allowGeneratedTaker === false
    || hasAdventurerContactEntry(nextDayEntries)
    ? []
    : getAvailableOrdinaryGenerationTemplates(gameData);
  const hiddenAdventurers = hiddenCandidateTemplates.map((adventurerTemplate) => {
    return createAdventurerCandidatePreview(
      gameData,
      adventurerTemplate,
      "quest_referral",
      quest
    );
  });
  const knownCandidate = chooseAdventurerForQuestByAcceptance(gameData, quest, template, visibleAdventurers);
  const hiddenCandidate = chooseGeneratedAdventurerForQuest(gameData, quest, template, hiddenAdventurers);
  const knownMargin = knownCandidate
    ? getQuestFitMargin(gameData, quest, knownCandidate)
    : null;
  const hiddenMargin = hiddenCandidate
    ? getQuestFitMargin(gameData, quest, hiddenCandidate)
    : null;
  const route = chooseQuestTakerRoute(
    gameData,
    quest,
    template,
    knownMargin,
    hiddenMargin,
    visibleAdventurers.length,
    hiddenAdventurers.length
  );

  if (route === "known" && knownCandidate) {
    return {adventurer: knownCandidate, source: "known"};
  }

  if (route === "hidden" && hiddenCandidate) {
    return {adventurer: hiddenCandidate, source: "hidden"};
  }

  return null;
}

function chooseGeneratedAdventurerForQuest(
  gameData: GameData,
  quest: Quest,
  template: QuestTemplate | undefined,
  hiddenAdventurers: Adventurer[]
): Adventurer | null {
  if (hiddenAdventurers.length === 0) {
    return null;
  }

  const rankedCandidates = hiddenAdventurers
    .map((adventurer) => ({
      adventurer,
      fitMargin: getQuestFitMargin(gameData, quest, adventurer),
      templatePull: getGeneratedTemplatePullScore(template, adventurer)
    }))
    .sort((left, right) => {
      const leftScore = left.fitMargin + left.templatePull;
      const rightScore = right.fitMargin + right.templatePull;
      return rightScore - leftScore;
    });
  const bestScore = rankedCandidates.length > 0
    ? rankedCandidates[0].fitMargin + rankedCandidates[0].templatePull
    : Number.NEGATIVE_INFINITY;
  const candidates = rankedCandidates.filter(({fitMargin, templatePull}) => {
    return fitMargin + templatePull >= bestScore - 0.18;
  });
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index]?.adventurer ?? rankedCandidates[0]?.adventurer ?? null;
}

function chooseQuestTakerRoute(
  gameData: GameData,
  quest: Quest,
  template: QuestTemplate | undefined,
  knownMargin: number | null,
  hiddenMargin: number | null,
  visibleCount: number,
  hiddenCount: number
): "known" | "hidden" | "none" {
  const pendingQuestCount = gameData.player.quests.filter((quest) => quest.status === "pending").length;
  const pendingAgeDays = Math.max(0, gameData.day - quest.createdDay);
  const knownResponsive = knownMargin !== null && knownMargin >= QUEST_TAKER_ROUTING_TUNING.responsiveGate.knownMarginFloor;
  const hiddenResponsive = hiddenMargin !== null && hiddenMargin >= QUEST_TAKER_ROUTING_TUNING.responsiveGate.hiddenMarginFloor;
  const agePressureDays = knownResponsive || hiddenResponsive ? pendingAgeDays : 0;
  const noTakerWeight = clamp(
    QUEST_TAKER_ROUTING_TUNING.noTaker.baseWeight
      - Math.max(0, knownMargin ?? 0) * QUEST_TAKER_ROUTING_TUNING.noTaker.knownPenaltyPerMargin
      - Math.max(0, hiddenMargin ?? 0) * QUEST_TAKER_ROUTING_TUNING.noTaker.hiddenPenaltyPerMargin
      - agePressureDays * QUEST_TAKER_ROUTING_TUNING.noTaker.agePenaltyPerDay,
    0.08,
    0.72
  );
  const knownWeight = !knownResponsive
    ? 0
    : QUEST_TAKER_ROUTING_TUNING.known.baseWeight
      + Math.max(0, knownMargin ?? 0) * QUEST_TAKER_ROUTING_TUNING.known.marginWeight
      + Math.min(visibleCount, 4) * QUEST_TAKER_ROUTING_TUNING.known.visibleRosterBonus
      + agePressureDays * QUEST_TAKER_ROUTING_TUNING.known.ageBonusPerDay;
  const hiddenWeight = !hiddenResponsive
    ? 0
    : QUEST_TAKER_ROUTING_TUNING.hidden.baseWeight
      * (template?.generatedTakerWeight ?? 1)
      + Math.max(0, hiddenMargin ?? 0) * QUEST_TAKER_ROUTING_TUNING.hidden.marginWeight
      + Math.min(hiddenCount, 4) * QUEST_TAKER_ROUTING_TUNING.hidden.hiddenRosterBonus
      + Math.min(pendingQuestCount, 4) * QUEST_TAKER_ROUTING_TUNING.hidden.pendingQuestBonus
      + agePressureDays * QUEST_TAKER_ROUTING_TUNING.hidden.ageBonusPerDay;

  return pickWeightedRoute([
    {route: "none", weight: noTakerWeight},
    {route: "known", weight: knownWeight},
    {route: "hidden", weight: hiddenWeight}
  ]);
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

function getQuestFitMargin(gameData: GameData, quest: Quest, adventurer: Adventurer): number {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const acceptance = getQuestAcceptanceBreakdown(gameData, quest, template, adventurer, 0);
  const interest = getQuestInterestBreakdown(gameData, adventurer, quest, template);

  return acceptance.finalScore - interest.finalThreshold;
}

function getGeneratedTemplatePullScore(
  template: QuestTemplate | undefined,
  adventurer: Adventurer
): number {
  if (!template || template.allowGeneratedTaker === false) {
    return Number.NEGATIVE_INFINITY;
  }

  const preferredTags = template.preferredArchetypeTags ?? [];
  const adventurerTags = adventurer.archetypeTags ?? [];
  const matchCount = preferredTags.filter((tag) => adventurerTags.includes(tag)).length;
  const tagScore = matchCount * 0.32;
  const generatedWeightScore = ((template.generatedTakerWeight ?? 1) - 1) * 0.28;
  return tagScore + generatedWeightScore;
}

function pickWeightedRoute(
  weightedRoutes: Array<{route: "known" | "hidden" | "none"; weight: number}>
): "known" | "hidden" | "none" {
  const totalWeight = weightedRoutes.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (totalWeight <= 0) {
    return "none";
  }

  let roll = Math.random() * totalWeight;
  for (const item of weightedRoutes) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) {
      return item.route;
    }
  }

  return weightedRoutes[weightedRoutes.length - 1]?.route ?? "none";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pickFlexibleTextValue(
  value: string | string[] | undefined,
  seedKey: string,
  fallback: string
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fallback;
    }

    return pickSeeded(value, seedKey);
  }

  return value ?? fallback;
}

function pickSeeded<T>(items: T[], seedKey: string): T {
  const normalized = (normalizedSeed(seedKey) + 1) / 2;
  const index = Math.min(items.length - 1, Math.floor(normalized * items.length));
  return items[index];
}

function normalizedSeed(seedKey: string): number {
  let hash = 0;
  for (let index = 0; index < seedKey.length; index += 1) {
    hash = ((hash << 5) - hash + seedKey.charCodeAt(index)) | 0;
  }

  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}
