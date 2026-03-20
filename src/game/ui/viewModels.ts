import {uiLabels} from "../text/uiLabels";
import {getPersonalityTags} from "../text/personalityText";
import {
  getDiscoveryLevelText,
  getIntelKindText,
  getIntelSourceOutcomeText,
  getIntelStatusText,
  getQuestNatureText,
  getQuestRiskText,
  getQuestStatusText
} from "../text/statusText";
import {
  formatCountSummary,
  formatDaySummary,
  formatMoneySummary,
  getAdventurerCurrentStatusText,
  getQuestAdventurerText,
  getQuestPublishModeText,
  getQuestProgressText
} from "../text/uiText";
import type {Adventurer, GameData, IntelRecord, IntelStatus, Quest} from "../types";
import {getQuestDisplayIdByInternalId, getQuestPublishMode, getQuestTemplateById} from "../systems/taskBoard";
import {getFollowUpTemplatesForIntel} from "../systems/questUnlocks";
import {formatResourcePreferences, getQuestResourceLabel, getResourceLabel} from "./resourceDisplay";

export interface HeaderSummaryViewModel {
  dayText: string;
  moneyText: string;
  activeQuestText: string;
  stockTotalText: string;
  knownAdventurerText: string;
}

export interface QuestCardViewModel {
  displayId: string;
  titleText: string;
  descriptionText: string;
  badgeText: string;
  statusClass: string;
  statusText: string;
  bodyText: string;
  riskText: string;
  natureText: string;
  rewardText: string;
  durationText: string;
  createdDayText: string;
  progressText: string;
  adventurerText: string;
  resultText: string | null;
}

export interface AdventurerCardViewModel {
  id: string;
  name: string;
  title: string;
  levelText: string;
  levelClass: string;
  isPinned: boolean;
  pinActionText: string;
  rumorText: string | null;
  impressionText: string | null;
  preferenceText: string | null;
  personalityText: string | null;
  currentStatusText: string | null;
  lastCompletedText: string | null;
  motiveText: string | null;
}

export interface StockItemViewModel {
  label: string;
  amount: string;
}

export interface IntelItemViewModel {
  badgeText: string;
  statusText: string;
  statusClass: string;
  titleText: string;
  summaryText: string;
  lineText: string | null;
  sourceText: string;
  methodText: string;
  dayText: string;
}

export function getHeaderSummaryViewModel(gameData: GameData): HeaderSummaryViewModel {
  return {
    dayText: formatDaySummary(gameData.day),
    moneyText: formatMoneySummary(gameData.player.money),
    activeQuestText: formatCountSummary(getActiveQuestCountFromData(gameData), "项"),
    stockTotalText: formatCountSummary(getTotalStockFromData(gameData), "件"),
    knownAdventurerText: formatCountSummary(getKnownAdventurers(gameData).length, "人")
  };
}

export function getQuestCardViewModel(gameData: GameData, quest: Quest): QuestCardViewModel {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const publishMode = getQuestPublishMode(template);
  const bodyText = publishMode === "intel"
    ? `${uiLabels.questCard.investigate} ${getQuestResourceLabel(gameData, quest)} 相关线索`
    : `${uiLabels.questCard.collect} ${quest.quantity} 个 ${getQuestResourceLabel(gameData, quest)}`;

  return {
    displayId: quest.displayId,
    titleText: quest.title,
    descriptionText: quest.description,
    badgeText: quest.followUpStageTag
      ? `${getQuestNatureText(quest.nature)} · ${uiLabels.questCard.followUpBadge}`
      : getQuestNatureText(quest.nature),
    statusClass: quest.status,
    statusText: getQuestStatusText(quest.status),
    bodyText,
    riskText: `${uiLabels.questCard.risk} ${getQuestRiskText(quest.risk)}`,
    natureText: `${uiLabels.questCard.nature} ${getQuestNatureText(quest.nature)}`,
    rewardText: `${getQuestPublishModeText(publishMode)} · ${uiLabels.questCard.reward} ${quest.reward} 钱`,
    durationText: `${uiLabels.questCard.estimatedDuration} ${quest.totalDays} ${uiLabels.questCard.daySuffix}`,
    createdDayText: `${uiLabels.questCard.createdDay} ${quest.createdDay} ${uiLabels.questCard.daySuffix}`,
    progressText: getQuestProgressText(quest),
    adventurerText: getQuestAdventurerText(quest.adventurerName),
    resultText: quest.result ? `${uiLabels.questCard.result} ${quest.result.summary}` : null
  };
}

export function getAdventurerCardViewModel(gameData: GameData, adventurer: Adventurer): AdventurerCardViewModel {
  const levelText = getDiscoveryLevelText(adventurer.knownLevel);
  const isPinned = gameData.pinnedAdventurerIds.includes(adventurer.id);
  const pinActionText = isPinned ? uiLabels.adventurerCard.unpin : uiLabels.adventurerCard.pin;

  if (adventurer.knownLevel === "heard") {
    return {
      id: adventurer.id,
      name: adventurer.name,
      title: adventurer.title,
      levelText,
      levelClass: "pending",
      isPinned,
      pinActionText,
      rumorText: adventurer.rumor,
      impressionText: null,
      preferenceText: null,
      personalityText: null,
      currentStatusText: null,
      lastCompletedText: null,
      motiveText: null
    };
  }

  const currentQuest = adventurer.currentQuestId === null
    ? null
    : gameData.player.quests.find((quest) => quest.id === adventurer.currentQuestId) ?? null;
  const latestCompletedQuest = getLatestCompletedQuest(gameData, adventurer.id);
  const currentQuestDisplayId = getQuestDisplayIdByInternalId(gameData, adventurer.currentQuestId);
  const personalityTagLimit = getPersonalityTagLimit(adventurer.knownLevel);
  const personalityTags = getPersonalityTags(adventurer, personalityTagLimit);
  const showPreference = adventurer.knownLevel !== "seen";
  const showPersonality = adventurer.knownLevel !== "seen";
  const showLastCompleted = adventurer.knownLevel !== "seen";
  const showMotive = adventurer.knownLevel === "trusted";
  return {
    id: adventurer.id,
    name: adventurer.name,
    title: adventurer.title,
    levelText,
    levelClass: "active",
    isPinned,
    pinActionText,
    rumorText: null,
    impressionText: `${uiLabels.adventurerCard.impression}：${adventurer.impression}`,
    preferenceText: showPreference
      ? `${uiLabels.adventurerCard.preference}：${formatResourcePreferences(gameData, adventurer.preferences)}`
      : null,
    personalityText: showPersonality && personalityTags.length > 0
      ? `${uiLabels.adventurerCard.personality}：${personalityTags.join(" / ")}`
      : null,
    currentStatusText: `${uiLabels.adventurerCard.currentStatus}：${getAdventurerCurrentStatusText(
      currentQuestDisplayId,
      currentQuest?.title ?? null
    )}`,
    lastCompletedText: showLastCompleted && latestCompletedQuest
      ? `${uiLabels.adventurerCard.lastCompleted}：第 ${latestCompletedQuest.completedDay} 天 · 任务 ${latestCompletedQuest.displayId} · ${latestCompletedQuest.title}`
      : null,
    motiveText: showMotive ? `${uiLabels.adventurerCard.motive}：${adventurer.motive}` : null
  };
}

export function getStockItemViewModel(gameData: GameData, resourceId: string, amount: number): StockItemViewModel {
  return {
    label: getResourceLabel(gameData, resourceId),
    amount: String(amount)
  };
}

export function getIntelItemViewModel(gameData: GameData, record: IntelRecord): IntelItemViewModel {
  const status = getIntelStatus(gameData, record);
  return {
    badgeText: getIntelKindText(record.kind),
    statusText: getIntelStatusText(status),
    statusClass: status,
    titleText: record.title,
    summaryText: record.summary,
    lineText: record.lineTitle ? `${uiLabels.intelBoard.line}：${record.lineTitle}` : null,
    sourceText: `${uiLabels.intelBoard.source}：任务 ${record.sourceQuestDisplayId} · ${record.sourceQuestTitle}`,
    methodText: `${uiLabels.intelBoard.method}：${getIntelSourceOutcomeText(record.sourceOutcome)}`,
    dayText: `记录于第 ${record.day} 天`
  };
}

function getIntelStatus(gameData: GameData, record: IntelRecord): IntelStatus {
  const matchingFollowUps = getFollowUpTemplatesForIntel(gameData, record);

  if (matchingFollowUps.length === 0) {
    return "recorded";
  }

  const hasPublishedFollowUp = matchingFollowUps.some((template) => {
    return gameData.player.quests.some((quest) => quest.templateId === template.id);
  });

  if (hasPublishedFollowUp) {
    return "triggered";
  }

  return "followable";
}

export function getKnownAdventurers(gameData: GameData): Adventurer[] {
  return gameData.adventurers.filter((adventurer) => adventurer.knownByDefault || adventurer.lastSeenDay !== null);
}

function getActiveQuestCountFromData(gameData: GameData): number {
  return gameData.player.quests.filter((quest) => quest.status === "active").length;
}

function getTotalStockFromData(gameData: GameData): number {
  return Object.values(gameData.player.stock).reduce((sum, value) => sum + value, 0);
}

function getPersonalityTagLimit(level: Adventurer["knownLevel"]): number {
  switch (level) {
    case "acquainted":
      return 1;
    case "familiar":
      return 2;
    case "trusted":
      return 3;
    default:
      return 0;
  }
}

function getLatestCompletedQuest(gameData: GameData, adventurerId: string): Quest | null {
  return gameData.player.quests.find(
    (quest) => quest.adventurerId === adventurerId && quest.completedDay !== null
  ) ?? null;
}
