import {createStoryEntry} from "../../text/storyText";
import {getQuestAcceptanceBreakdown, getQuestInterestBreakdown} from "../quests/taskAcceptance";
import {getQuestTemplateById} from "../quests/taskBoard";
import {
  createGeneratedAdventurerInstance,
  getDiscoveryLevelFromPoints
} from "./adventurerInstances";
import type {Adventurer, AdventurerTemplate, GameData, Quest, StoryEntry} from "../../core/types";

type AdventurerContactSource = "inn_introduction" | "quest_referral";
const ADVENTURER_CONTACT_BADGES = new Set(["新面孔", "引介"]);

const APPEARANCE_TUNING = {
  minimumChance: 0.04,
  baseChance: 0.08,
  demandPressure: 0.1,
  pendingAgePressurePerDay: 0.06,
  responsiveMarginFloor: -0.08,
  deficitBonusPerSlot: 0.18,
  overflowPenaltyPerSlot: 0.08,
  maximumChance: 0.72,
  baseComfortBand: 2,
  questDrivenComfortBandCap: 6
} as const;

export function advanceAdventurerAppearance(gameData: GameData, nextDayEntries: StoryEntry[]): void {
  if (hasAdventurerContactEntry(nextDayEntries)) {
    return;
  }

  const hiddenTemplates = getAvailableOrdinaryGenerationTemplates(gameData);
  if (hiddenTemplates.length === 0) {
    return;
  }

  const appearanceChance = getAppearanceChance(gameData);
  if (Math.random() > appearanceChance) {
    return;
  }

  const appearingTemplate = chooseAppearingTemplate(gameData, hiddenTemplates);
  if (!appearingTemplate) {
    return;
  }

  triggerAdventurerContactEvent(gameData, appearingTemplate, nextDayEntries, "inn_introduction");
}

export function tryQuestReferralAppearance(
  gameData: GameData,
  quest: Quest,
  nextDayEntries: StoryEntry[]
): Adventurer | null {
  if (hasAdventurerContactEntry(nextDayEntries)) {
    return null;
  }

  const hiddenTemplates = getAvailableOrdinaryGenerationTemplates(gameData);
  if (hiddenTemplates.length === 0) {
    return null;
  }

  const appearanceChance = getQuestReferralChance(gameData);
  if (Math.random() > appearanceChance) {
    return null;
  }

  const referredTemplate = chooseBestQuestCandidateTemplate(gameData, hiddenTemplates, quest);
  if (!referredTemplate) {
    return null;
  }

  return triggerAdventurerContactEvent(gameData, referredTemplate, nextDayEntries, "quest_referral", quest);
}

export function getAvailableOrdinaryGenerationTemplates(gameData: GameData): AdventurerTemplate[] {
  return gameData.adventurerTemplates.filter((template) => {
    const alreadyInstanced = gameData.adventurers.some((adventurer) => adventurer.templateId === template.id);
    return !alreadyInstanced && (template.roleType ?? "adventurer") === "adventurer" && !template.knownByDefault;
  });
}

export function getAvailableKnownAdventurers(gameData: GameData): Adventurer[] {
  return gameData.adventurers.filter((adventurer) => {
    return adventurer.currentQuestId === null && isAdventurerKnownToPlayer(adventurer);
  });
}

export function isAdventurerKnownToPlayer(adventurer: Adventurer): boolean {
  return adventurer.lastSeenDay !== null;
}

export function hasAdventurerContactEntry(entries: StoryEntry[]): boolean {
  return entries.some((entry) => entry.badge !== null && ADVENTURER_CONTACT_BADGES.has(entry.badge));
}

function getAppearanceChance(gameData: GameData): number {
  const visibleOrdinaryCount = gameData.adventurers.filter((adventurer) => {
    return adventurer.roleType === "adventurer" && adventurer.lastSeenDay !== null;
  }).length;
  const pendingQuests = gameData.player.quests.filter((quest) => quest.status === "pending");
  const pendingQuestCount = pendingQuests.length;
  const oldestResponsivePendingAge = pendingQuests.reduce((oldestAge, quest) => {
    const bestFitScore = getBestHiddenQuestFitScore(gameData, quest);
    if (bestFitScore < APPEARANCE_TUNING.responsiveMarginFloor) {
      return oldestAge;
    }

    return Math.max(oldestAge, Math.max(0, gameData.day - quest.createdDay));
  }, 0);
  const comfortBand = getComfortBandTarget(pendingQuestCount);
  const deficit = Math.max(0, comfortBand - visibleOrdinaryCount);
  const overflow = Math.max(0, visibleOrdinaryCount - comfortBand);
  const questPressure = pendingQuestCount > 0 ? APPEARANCE_TUNING.demandPressure : 0;
  const chance = APPEARANCE_TUNING.baseChance
    + deficit * APPEARANCE_TUNING.deficitBonusPerSlot
    + questPressure
    + oldestResponsivePendingAge * APPEARANCE_TUNING.pendingAgePressurePerDay
    - overflow * APPEARANCE_TUNING.overflowPenaltyPerSlot;

  return clamp(chance, APPEARANCE_TUNING.minimumChance, APPEARANCE_TUNING.maximumChance);
}

function getComfortBandTarget(pendingQuestCount: number): number {
  return Math.min(
    APPEARANCE_TUNING.questDrivenComfortBandCap,
    APPEARANCE_TUNING.baseComfortBand + pendingQuestCount
  );
}

function chooseAppearingTemplate(gameData: GameData, hiddenTemplates: AdventurerTemplate[]): AdventurerTemplate | null {
  const pendingQuests = gameData.player.quests.filter((quest) => quest.status === "pending");
  if (pendingQuests.length === 0) {
    const index = Math.floor(Math.random() * hiddenTemplates.length);
    return hiddenTemplates[index] ?? null;
  }

  const rankedTemplates = hiddenTemplates
    .map((template) => ({
      template,
      fitScore:
        getBestQuestFitScore(gameData, createCandidatePreview(gameData, template, "inn_introduction"))
        + getIntroductionScore(template, "inn_introduction")
        + getPendingQuestDemandScore(gameData, template, "inn_introduction")
    }))
    .sort((left, right) => right.fitScore - left.fitScore);
  const bestFitScore = rankedTemplates[0]?.fitScore ?? Number.NEGATIVE_INFINITY;
  const candidates = rankedTemplates.filter(({fitScore}) => fitScore >= bestFitScore - 0.22);
  const index = Math.floor(Math.random() * candidates.length);

  return candidates[index]?.template ?? rankedTemplates[0]?.template ?? null;
}

export function triggerAdventurerContactEvent(
  gameData: GameData,
  template: AdventurerTemplate,
  nextDayEntries: StoryEntry[],
  source: AdventurerContactSource,
  quest: Quest | null = null
): Adventurer {
  const adventurer = ensureGeneratedAdventurerInstance(gameData, template, source, quest);
  revealAdventurer(adventurer, gameData.day);
  nextDayEntries.push(createContactStoryEntry(gameData.day, adventurer, source, quest));
  return adventurer;
}

function getBestQuestFitScore(gameData: GameData, adventurer: Adventurer): number {
  const pendingQuests = gameData.player.quests.filter((quest) => quest.status === "pending");
  if (pendingQuests.length === 0) {
    return 0;
  }

  return pendingQuests.reduce((bestScore, quest) => {
    const template = getQuestTemplateById(gameData, quest.templateId);
    const acceptance = getQuestAcceptanceBreakdown(gameData, quest, template, adventurer, 0);
    const interest = getQuestInterestBreakdown(gameData, adventurer, quest, template);
    const fitScore = acceptance.finalScore - interest.finalThreshold;
    return Math.max(bestScore, fitScore);
  }, Number.NEGATIVE_INFINITY);
}

function getQuestReferralChance(gameData: GameData): number {
  const pendingQuests = gameData.player.quests.filter((quest) => quest.status === "pending");
  const pendingQuestCount = pendingQuests.length;
  const visibleOrdinaryCount = gameData.adventurers.filter((adventurer) => {
    return adventurer.roleType === "adventurer" && adventurer.lastSeenDay !== null;
  }).length;
  const oldestResponsivePendingAge = pendingQuests.reduce((oldestAge, quest) => {
    const bestFitScore = getBestHiddenQuestFitScore(gameData, quest);
    if (bestFitScore < APPEARANCE_TUNING.responsiveMarginFloor) {
      return oldestAge;
    }

    return Math.max(oldestAge, Math.max(0, gameData.day - quest.createdDay));
  }, 0);
  const comfortBand = getComfortBandTarget(pendingQuestCount);
  const deficit = Math.max(0, comfortBand - visibleOrdinaryCount);
  const chance = 0.22 + deficit * 0.14 + oldestResponsivePendingAge * 0.1;

  return clamp(chance, 0.12, 0.68);
}

function chooseBestQuestCandidateTemplate(
  gameData: GameData,
  hiddenTemplates: AdventurerTemplate[],
  quest: Quest
): AdventurerTemplate | null {
  const rankedTemplates = hiddenTemplates
    .map((template) => ({
      template,
      fitScore:
        getQuestFitScore(gameData, createCandidatePreview(gameData, template, "quest_referral", quest), quest)
        + getIntroductionScore(template, "quest_referral")
        + getQuestTemplateArchetypeScore(gameData, quest, template)
        + getQuestTemplateGeneratedPullScore(gameData, quest, template)
    }))
    .sort((left, right) => right.fitScore - left.fitScore);
  const bestFitScore = rankedTemplates[0]?.fitScore ?? Number.NEGATIVE_INFINITY;
  const candidates = rankedTemplates.filter(({fitScore}) => fitScore >= bestFitScore - 0.18);
  const index = Math.floor(Math.random() * candidates.length);

  return candidates[index]?.template ?? rankedTemplates[0]?.template ?? null;
}

function revealAdventurer(adventurer: Adventurer, day: number): void {
  adventurer.lastSeenDay = day;
  adventurer.acquaintancePoints = Math.max(1, adventurer.acquaintancePoints);
  adventurer.knownLevel = getDiscoveryLevelFromPoints(adventurer.acquaintancePoints);
}

function createContactStoryEntry(
  day: number,
  adventurer: Adventurer,
  source: AdventurerContactSource,
  quest: Quest | null
): StoryEntry {
  switch (source) {
    case "quest_referral":
      return createStoryEntry("adventurer_referred_for_quest", {
        day,
        adventurerName: adventurer.name,
        adventurerTitle: adventurer.title,
        questDisplayId: quest?.displayId ?? "未知委托",
        questTitle: quest?.title ?? "未知委托"
      });
    case "inn_introduction":
    default:
      return createStoryEntry("adventurer_introduced_at_inn", {
        day,
        adventurerName: adventurer.name,
        adventurerTitle: adventurer.title
      });
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getQuestFitScore(gameData: GameData, adventurer: Adventurer, quest: Quest): number {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const acceptance = getQuestAcceptanceBreakdown(gameData, quest, template, adventurer, 0);
  const interest = getQuestInterestBreakdown(gameData, adventurer, quest, template);
  return acceptance.finalScore - interest.finalThreshold;
}

function getBestHiddenQuestFitScore(gameData: GameData, quest: Quest): number {
  const hiddenTemplates = getAvailableOrdinaryGenerationTemplates(gameData);
  if (hiddenTemplates.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return hiddenTemplates.reduce((bestScore, template) => {
    return Math.max(bestScore, getQuestFitScore(gameData, createCandidatePreview(gameData, template, "quest_referral", quest), quest));
  }, Number.NEGATIVE_INFINITY);
}

function ensureGeneratedAdventurerInstance(
  gameData: GameData,
  template: AdventurerTemplate,
  source: AdventurerContactSource,
  quest: Quest | null
): Adventurer {
  const existingAdventurer = gameData.adventurers.find((adventurer) => adventurer.templateId === template.id);
  if (existingAdventurer) {
    return existingAdventurer;
  }

  const generatedAdventurer = createCandidatePreview(gameData, template, source, quest);
  gameData.adventurers.unshift(generatedAdventurer);
  return generatedAdventurer;
}

function createCandidatePreview(
  gameData: GameData,
  template: AdventurerTemplate,
  source: AdventurerContactSource,
  quest: Quest | null = null
): Adventurer {
  const questKey = quest ? `${quest.templateId}:${quest.createdDay}` : "none";
  const seedKey = `${template.id}:${source}:${gameData.day}:${questKey}`;
  return createGeneratedAdventurerInstance(template, gameData.day, seedKey, gameData.namePools);
}

function getIntroductionScore(template: AdventurerTemplate, source: AdventurerContactSource): number {
  const tags = template.introductionTags ?? [];
  return tags.includes(source) ? 0.24 : 0;
}

function getQuestTemplateArchetypeScore(
  gameData: GameData,
  quest: Quest,
  template: AdventurerTemplate
): number {
  const questTemplate = getQuestTemplateById(gameData, quest.templateId);
  const preferredTags = questTemplate?.preferredArchetypeTags ?? [];
  const templateTags = template.archetypeTags ?? [];
  const matchCount = preferredTags.filter((tag) => templateTags.includes(tag)).length;
  return matchCount * 0.28;
}

function getQuestTemplateGeneratedPullScore(
  gameData: GameData,
  quest: Quest,
  template: AdventurerTemplate
): number {
  const questTemplate = getQuestTemplateById(gameData, quest.templateId);
  if (!questTemplate || questTemplate.allowGeneratedTaker === false) {
    return Number.NEGATIVE_INFINITY;
  }

  const pendingAgeDays = Math.max(0, gameData.day - quest.createdDay);
  const ageBonus = Math.min(0.36, pendingAgeDays * 0.08);
  const generatedWeightBonus = ((questTemplate.generatedTakerWeight ?? 1) - 1) * 0.32;
  const publicTaskSoftBonus = questTemplate.risk === "safe" && questTemplate.difficulty === "easy" ? 0.06 : 0;
  return ageBonus + generatedWeightBonus + publicTaskSoftBonus;
}

function getPendingQuestDemandScore(
  gameData: GameData,
  template: AdventurerTemplate,
  source: AdventurerContactSource
): number {
  const pendingQuests = gameData.player.quests.filter((quest) => quest.status === "pending");
  return pendingQuests.reduce((score, quest) => {
    const questTemplate = getQuestTemplateById(gameData, quest.templateId);
    if (!questTemplate || questTemplate.allowGeneratedTaker === false) {
      return score;
    }

    const ageDays = Math.max(0, gameData.day - quest.createdDay);
    const introductionScore = getIntroductionScore(template, source);
    const archetypeScore = getQuestTemplateArchetypeScore(gameData, quest, template);
    const generatedPullScore = getQuestTemplateGeneratedPullScore(gameData, quest, template);
    return score + introductionScore + archetypeScore + generatedPullScore * Math.min(1, 0.45 + ageDays * 0.12);
  }, 0);
}
