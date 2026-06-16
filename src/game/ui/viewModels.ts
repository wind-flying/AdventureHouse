import {uiLabels} from "../text/uiLabels";
import {getPersonalityTags} from "../text/personalityText";
import {
  getDiscoveryLevelText,
  getIntelKindText,
  getIntelSourceOutcomeText,
  getIntelStatusText,
  getQuestNatureText,
  getQuestResultVisibleReasonLimit,
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
import type {
  Adventurer,
  EquipmentSlot,
  GameData,
  IntelRecord,
  IntelStatus,
  ItemCategory,
  Quest,
  ResourceCategory
} from "../core/types";
import {isAdventurerKnownToPlayer} from "../systems/adventurers/adventurerAppearance";
import {getQuestDisplayIdByInternalId, getQuestPublishMode, getQuestTemplateById} from "../systems/quests/taskBoard";
import {getFollowUpTemplatesForIntel} from "../systems/quests/questUnlocks";
import {getQuestResultSummary, getQuestResultVisibleReasonTexts} from "../systems/quests/taskResult";
import {formatResourcePreferences, getQuestResourceLabel, getResourceLabel} from "./resourceDisplay";

export interface HeaderSummaryViewModel {
  dayText: string;
  moneyText: string;
  activeQuestText: string;
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
  resultReasonText: string | null;
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
  description: string | null;
}

export interface StockSubsectionViewModel {
  id: string;
  title: string | null;
  items: StockItemViewModel[];
}

export interface StockSectionViewModel {
  id: string;
  title: string;
  summary: string;
  groups: StockSubsectionViewModel[];
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
    badgeText: getQuestNatureText(quest.nature),
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
    resultText: quest.result ? `${uiLabels.questCard.result} ${getQuestResultSummary(gameData, quest, quest.result)}` : null,
    resultReasonText: quest.result
      ? formatQuestResultReasonText(gameData, quest)
      : null
  };
}

function formatQuestResultReasonText(gameData: GameData, quest: Quest) {
  const visibleReasonTexts = getQuestResultVisibleReasonTexts(gameData, quest);
  const visibleReasonLimit = getQuestResultVisibleReasonLimit(gameData.player.resultInsightLevel);
  if (visibleReasonLimit <= 0 || visibleReasonTexts.length === 0) {
    return null;
  }

  return `${uiLabels.questCard.resultReason} ${visibleReasonTexts.slice(0, visibleReasonLimit).join(" / ")}`;
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
    amount: String(amount),
    description: null
  };
}

export function getStockSectionsViewModel(gameData: GameData): StockSectionViewModel[] {
  const sections = new Map<string, StockSectionViewModel>();

  gameData.resources
    .filter((resource) => (gameData.player.stock[resource.id] ?? 0) > 0)
    .sort((left, right) => compareStockSort(left.category ?? "misc", right.category ?? "misc", left.sortOrder, right.sortOrder))
    .forEach((resource) => {
      const category = resource.category ?? "misc";
      const section = getOrCreateStockSection(sections, category, getStockCategoryTitle(category));
      section.groups[0]?.items.push({
        label: `${resource.icon} ${resource.name}`,
        amount: String(gameData.player.stock[resource.id] ?? 0),
        description: null
      });
    });

  gameData.itemDefinitions
    .filter((item) => (gameData.player.inventory.itemStacks[item.id] ?? 0) > 0)
    .sort((left, right) => compareStockSort(left.category, right.category, left.sortOrder, right.sortOrder))
    .forEach((item) => {
      const section = getOrCreateStockSection(sections, item.category, getItemCategoryTitle(item.category));
      section.groups[0]?.items.push({
        label: `${item.icon} ${item.name}`,
        amount: String(gameData.player.inventory.itemStacks[item.id] ?? 0),
        description: item.playerDescription
      });
    });

  const equipmentSection = getOwnedEquipmentSection(gameData);
  if (equipmentSection) {
    sections.set(equipmentSection.id, equipmentSection);
  }

  return Array.from(sections.values())
    .sort((left, right) => getCategoryOrder(left.id) - getCategoryOrder(right.id))
    .map((section) => ({
      ...section,
      summary: formatCountSummary(section.groups.reduce((sum, group) => sum + group.items.length, 0), "类")
    }));
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
  return gameData.adventurers.filter((adventurer) => adventurer.knownByDefault || isAdventurerKnownToPlayer(adventurer));
}

function getActiveQuestCountFromData(gameData: GameData): number {
  return gameData.player.quests.filter((quest) => quest.status === "active").length;
}

function getOrCreateStockSection(
  sections: Map<string, StockSectionViewModel>,
  id: string,
  title: string
): StockSectionViewModel {
  const existing = sections.get(id);
  if (existing) {
    return existing;
  }

  const section: StockSectionViewModel = {
    id,
    title,
    summary: "",
    groups: [
      {
        id,
        title: null,
        items: []
      }
    ]
  };
  sections.set(id, section);
  return section;
}

function getOwnedEquipmentSection(gameData: GameData): StockSectionViewModel | null {
  const ownedEquipment = gameData.player.inventory.equipments
    .map((equipment) => {
      const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === equipment.definitionId);
      return definition ? {equipment, definition} : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => {
      const slotDifference = getEquipmentSlotOrder(left.definition.slot) - getEquipmentSlotOrder(right.definition.slot);
      return slotDifference !== 0
        ? slotDifference
        : left.definition.sortOrder - right.definition.sortOrder;
    });

  if (ownedEquipment.length === 0) {
    return null;
  }

  const groups = new Map<EquipmentSlot, StockSubsectionViewModel>();
  ownedEquipment.forEach(({equipment, definition}) => {
    const group = groups.get(definition.slot) ?? {
      id: definition.slot,
      title: getEquipmentSlotTitle(definition.slot),
      items: []
    };
    group.items.push({
      label: `${definition.icon} ${definition.name}`,
      amount: "1",
      description: `${definition.playerDescription} ${formatEquipmentEffects(equipment.effects)}`
    });
    groups.set(definition.slot, group);
  });

  return {
    id: "equipment",
    title: uiLabels.stockCategories.equipment,
    summary: "",
    groups: Array.from(groups.values())
  };
}

function compareStockSort(
  leftCategory: ResourceCategory | ItemCategory,
  rightCategory: ResourceCategory | ItemCategory,
  leftSortOrder = 0,
  rightSortOrder = 0
): number {
  const categoryDifference = getCategoryOrder(leftCategory) - getCategoryOrder(rightCategory);
  return categoryDifference !== 0 ? categoryDifference : leftSortOrder - rightSortOrder;
}

function getCategoryOrder(category: string): number {
  const categoryOrder = ["material", "food", "product", "consumable", "equipment", "treasure", "misc"];
  const index = categoryOrder.indexOf(category);
  return index >= 0 ? index : categoryOrder.length;
}

function getEquipmentSlotOrder(slot: EquipmentSlot): number {
  const slotOrder: EquipmentSlot[] = ["weapon", "shield", "helmet", "armor", "legArmor", "boots", "accessory", "tool"];
  const index = slotOrder.indexOf(slot);
  return index >= 0 ? index : slotOrder.length;
}

function getStockCategoryTitle(category: ResourceCategory): string {
  return uiLabels.stockCategories[category] ?? uiLabels.stockCategories.misc;
}

function getItemCategoryTitle(category: ItemCategory): string {
  return uiLabels.itemCategories[category] ?? uiLabels.itemCategories.misc;
}

function getEquipmentSlotTitle(slot: EquipmentSlot): string {
  return uiLabels.equipmentSlots[slot] ?? slot;
}

function formatEquipmentEffects(effects: Array<{target: string; value: number}>): string {
  if (effects.length === 0) {
    return "";
  }

  const effectText = effects.map((effect) => {
    const sign = effect.value > 0 ? "+" : "";
    return `${getEffectTargetTitle(effect.target)} ${sign}${effect.value}`;
  });
  return `效果：${effectText.join(" / ")}`;
}

function getEffectTargetTitle(target: string): string {
  return uiLabels.effectTargets[target as keyof typeof uiLabels.effectTargets] ?? target;
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
