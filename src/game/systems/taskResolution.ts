import type {
  Adventurer,
  Difficulty,
  Quest,
  QuestFeatures,
  QuestNature,
  QuestRisk,
  QuestTemplate
} from "../types.js";

export const QUEST_RESOLUTION_TUNING = {
  baseIntelSuccessChance: 0.7,
  featureScaleMax: 100,
  capabilityScaleMax: 100,
  baselineCapabilityRaw: 35,
  standardAdvantagedTargetChance: 0.6,
  standardChallengedTargetChance: 0.45,
  standardChanceTolerance: 0.03,
  totalPenaltyBudget: 0.42,
  dangerPenaltyShare: 0.28,
  challengePenaltyShare: 0.24,
  durationPressurePenaltyShare: 0.15,
  uncertaintyPenaltyShare: 0.19,
  reportDifficultyPenaltyShare: 0.14,
  stabilityBonusWeight: 0.12,
  clueBonusPerIntel: 0.035,
  clueBonusCap: 0.12,
  capabilityCenter: 0.35,
  capabilityWeight: 1.08,
  capabilityWeightPower: 2,
  personalityWeight: {
    curiosityInvestigationBonus: 0.06,
    curiosityMysteriousBonus: 0.08,
    cautionUncertaintyPenalty: -0.06,
    cautionDangerPenalty: -0.05,
    resiliencePressureBonus: 0.05,
    courageDangerBonus: 0.04,
    disciplineStabilityBonus: 0.05
  },
  minSuccessChance: 0.18,
  maxSuccessChance: 1
} as const;

export interface QuestResolutionInput {
  features: QuestFeatures;
  risk: QuestRisk;
  nature: QuestNature;
  totalDays: number;
  difficulty: Difficulty;
}

export interface QuestSuccessBreakdown {
  rawFeatures: QuestFeatures;
  inputFeatures: QuestFeatures;
  baseChance: number;
  dangerPenalty: number;
  challengePenalty: number;
  durationPressurePenalty: number;
  uncertaintyPenalty: number;
  reportDifficultyPenalty: number;
  stabilityBonus: number;
  intelBonus: number;
  capabilityBonus: number;
  personalityBonus: number;
  rawFinalChance: number;
  finalChance: number;
  wasClamped: boolean;
}

export function getQuestResolutionInput(quest: Quest, template: QuestTemplate): QuestResolutionInput {
  return {
    features: getQuestFeatures(template),
    risk: quest.risk,
    nature: quest.nature,
    totalDays: quest.totalDays,
    difficulty: template.difficulty
  };
}

export function getQuestSuccessBreakdown(
  input: QuestResolutionInput,
  adventurer: Adventurer | undefined,
  matchingIntelCount: number
): QuestSuccessBreakdown {
  const normalizedFeatures = normalizeQuestFeatures(input.features);
  const baseChance = QUEST_RESOLUTION_TUNING.baseIntelSuccessChance;
  const dangerPenalty = -getPenaltyContribution(
    normalizedFeatures.danger,
    QUEST_RESOLUTION_TUNING.dangerPenaltyShare
  );
  const challengePenalty = -getPenaltyContribution(
    normalizedFeatures.challenge,
    QUEST_RESOLUTION_TUNING.challengePenaltyShare
  );
  const durationPressurePenalty = -getPenaltyContribution(
    normalizedFeatures.durationPressure,
    QUEST_RESOLUTION_TUNING.durationPressurePenaltyShare
  );
  const uncertaintyPenalty = -getPenaltyContribution(
    normalizedFeatures.uncertainty,
    QUEST_RESOLUTION_TUNING.uncertaintyPenaltyShare
  );
  const reportDifficultyPenalty = -getPenaltyContribution(
    normalizedFeatures.reportDifficulty,
    QUEST_RESOLUTION_TUNING.reportDifficultyPenaltyShare
  );
  const stabilityBonus = (normalizedFeatures.stability - 0.5) * QUEST_RESOLUTION_TUNING.stabilityBonusWeight;
  const intelBonus = getQuestIntelBonusFromCount(matchingIntelCount);
  const capabilityBonus = adventurer ? getQuestCapabilityBonus({...input, features: normalizedFeatures}, adventurer) : 0;
  const personalityBonus = adventurer ? getQuestPersonalityBonus({...input, features: normalizedFeatures}, adventurer) : 0;
  const rawFinalChance =
    baseChance
    + dangerPenalty
    + challengePenalty
    + durationPressurePenalty
    + uncertaintyPenalty
    + reportDifficultyPenalty
    + stabilityBonus
    + intelBonus
    + capabilityBonus
    + personalityBonus;
  const finalChance = clamp(
    rawFinalChance,
    QUEST_RESOLUTION_TUNING.minSuccessChance,
    QUEST_RESOLUTION_TUNING.maxSuccessChance
  );

  return {
    rawFeatures: input.features,
    inputFeatures: normalizedFeatures,
    baseChance,
    dangerPenalty,
    challengePenalty,
    durationPressurePenalty,
    uncertaintyPenalty,
    reportDifficultyPenalty,
    stabilityBonus,
    intelBonus,
    capabilityBonus,
    personalityBonus,
    rawFinalChance,
    finalChance,
    wasClamped: finalChance !== rawFinalChance
  };
}

export function getQuestFeatures(template: Pick<QuestTemplate, "features" | "risk" | "difficulty" | "timingMode" | "fixedDurationDays" | "nature">): QuestFeatures {
  const fallback = getFallbackQuestFeatures(template);
  const features = template.features ?? {};

  return {
    danger: sanitizeQuestFeatureValue(features.danger ?? fallback.danger),
    challenge: sanitizeQuestFeatureValue(features.challenge ?? fallback.challenge),
    durationPressure: sanitizeQuestFeatureValue(features.durationPressure ?? fallback.durationPressure),
    uncertainty: sanitizeQuestFeatureValue(features.uncertainty ?? fallback.uncertainty),
    investigationComplexity: sanitizeQuestFeatureValue(features.investigationComplexity ?? fallback.investigationComplexity),
    reportDifficulty: sanitizeQuestFeatureValue(features.reportDifficulty ?? fallback.reportDifficulty),
    stability: sanitizeQuestFeatureValue(features.stability ?? fallback.stability)
  };
}

export function getQuestIntelBonusFromCount(matchingIntelCount: number): number {
  return Math.min(
    matchingIntelCount * QUEST_RESOLUTION_TUNING.clueBonusPerIntel,
    QUEST_RESOLUTION_TUNING.clueBonusCap
  );
}

export function getQuestCapabilityBonus(input: QuestResolutionInput, adventurer: Adventurer): number {
  const weightedCapability = getWeightedCapabilityScore(input, adventurer);
  return (weightedCapability - QUEST_RESOLUTION_TUNING.capabilityCenter) * QUEST_RESOLUTION_TUNING.capabilityWeight;
}

export function getWeightedCapabilityScore(input: QuestResolutionInput, adventurer: Adventurer): number {
  const weights = getQuestCapabilityWeights(input);
  const weightedDemand = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value ** QUEST_RESOLUTION_TUNING.capabilityWeightPower])
  ) as typeof weights;
  const totalWeight = Object.values(weightedDemand).reduce((sum, value) => sum + value, 0);

  if (totalWeight <= 0) {
    return QUEST_RESOLUTION_TUNING.capabilityCenter;
  }

  return (
    getEffectiveCapabilityValue(adventurer.capabilities.physique) * weightedDemand.physique
    + getEffectiveCapabilityValue(adventurer.capabilities.survival) * weightedDemand.survival
    + getEffectiveCapabilityValue(adventurer.capabilities.exploration) * weightedDemand.exploration
    + getEffectiveCapabilityValue(adventurer.capabilities.observation) * weightedDemand.observation
    + getEffectiveCapabilityValue(adventurer.capabilities.combat) * weightedDemand.combat
  ) / totalWeight;
}

export function getQuestCapabilityWeights(input: QuestResolutionInput) {
  const {features, nature} = input;

  return {
    physique: 0.06 + features.durationPressure * 0.58,
    survival: 0.08
      + features.danger * 0.22
      + features.durationPressure * 0.08
      + (1 - features.stability) * 0.32
      + features.uncertainty * 0.06,
    exploration: 0.1 + features.challenge * 0.26 + features.uncertainty * 0.14 + (nature === "investigation" ? 0.08 : 0),
    observation: 0.08 + features.uncertainty * 0.08 + features.investigationComplexity * 0.5 + features.reportDifficulty * 0.34,
    combat: 0.06 + features.danger * 0.44 + features.challenge * 0.04 + (nature === "mysterious" ? 0.22 : 0)
  };
}

export function getQuestPersonalityBonus(input: QuestResolutionInput, adventurer: Adventurer): number {
  let bonus = 0;

  if (input.nature === "investigation") {
    bonus += adventurer.personality.curiosity * QUEST_RESOLUTION_TUNING.personalityWeight.curiosityInvestigationBonus;
  }

  if (input.nature === "mysterious") {
    bonus += adventurer.personality.curiosity * QUEST_RESOLUTION_TUNING.personalityWeight.curiosityMysteriousBonus;
  }

  bonus += adventurer.personality.caution * input.features.uncertainty * QUEST_RESOLUTION_TUNING.personalityWeight.cautionUncertaintyPenalty;
  bonus += adventurer.personality.caution * input.features.danger * QUEST_RESOLUTION_TUNING.personalityWeight.cautionDangerPenalty;
  bonus += adventurer.personality.courage * input.features.danger * QUEST_RESOLUTION_TUNING.personalityWeight.courageDangerBonus;
  bonus += adventurer.personality.resilience * input.features.durationPressure * QUEST_RESOLUTION_TUNING.personalityWeight.resiliencePressureBonus;
  bonus += adventurer.personality.discipline * input.features.stability * QUEST_RESOLUTION_TUNING.personalityWeight.disciplineStabilityBonus;

  return bonus;
}

function getFallbackQuestFeatures(template: Pick<QuestTemplate, "risk" | "difficulty" | "timingMode" | "fixedDurationDays" | "nature">): QuestFeatures {
  const totalDays = getTotalDays(template);
  const danger = mapRiskToDanger(template.risk);
  const challenge = mapDifficultyToChallenge(template.difficulty);
  const durationPressure = clampFeature((Math.max(1, totalDays) - 1) / 4);
  const uncertaintyBase = template.nature === "mysterious" ? 0.75 : template.nature === "investigation" ? 0.58 : 0.22;
  const investigationComplexity = template.nature === "mysterious" ? 0.7 : template.nature === "investigation" ? 0.6 : 0.25;
  const reportDifficulty = template.nature === "mysterious" ? 0.72 : template.nature === "investigation" ? 0.55 : 0.2;
  const stability = clampFeature(1 - ((uncertaintyBase * 0.45) + (danger * 0.35) + (durationPressure * 0.2)));

  return {
    danger: denormalizeQuestFeatureValue(danger),
    challenge: denormalizeQuestFeatureValue(challenge),
    durationPressure: denormalizeQuestFeatureValue(durationPressure),
    uncertainty: denormalizeQuestFeatureValue(clampFeature(uncertaintyBase)),
    investigationComplexity: denormalizeQuestFeatureValue(clampFeature(investigationComplexity)),
    reportDifficulty: denormalizeQuestFeatureValue(clampFeature(reportDifficulty)),
    stability: denormalizeQuestFeatureValue(stability)
  };
}

function mapRiskToDanger(risk: QuestRisk): number {
  if (risk === "dangerous") {
    return 1;
  }

  if (risk === "risky") {
    return 0.6;
  }

  return 0.2;
}

function mapDifficultyToChallenge(difficulty: Difficulty): number {
  if (difficulty === "hard") {
    return 1;
  }

  if (difficulty === "medium") {
    return 0.58;
  }

  return 0.22;
}

function getTotalDays(template: Pick<QuestTemplate, "timingMode" | "fixedDurationDays">) {
  if (template.timingMode === "fixed") {
    return Math.max(1, template.fixedDurationDays ?? 1);
  }

  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampFeature(value: number): number {
  return clamp(value, 0, 1);
}

export function normalizeQuestFeatures(features: QuestFeatures): QuestFeatures {
  return {
    danger: normalizeQuestFeatureValue(features.danger),
    challenge: normalizeQuestFeatureValue(features.challenge),
    durationPressure: normalizeQuestFeatureValue(features.durationPressure),
    uncertainty: normalizeQuestFeatureValue(features.uncertainty),
    investigationComplexity: normalizeQuestFeatureValue(features.investigationComplexity),
    reportDifficulty: normalizeQuestFeatureValue(features.reportDifficulty),
    stability: normalizeQuestFeatureValue(features.stability)
  };
}

export function normalizeQuestFeatureValue(rawValue: number): number {
  if (rawValue <= 1) {
    return clampFeature(rawValue);
  }

  return clampFeature(rawValue / QUEST_RESOLUTION_TUNING.featureScaleMax);
}

export function denormalizeQuestFeatureValue(normalizedValue: number): number {
  return Math.round(clampFeature(normalizedValue) * QUEST_RESOLUTION_TUNING.featureScaleMax);
}

export function sanitizeQuestFeatureValue(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  if (rawValue < 0) {
    return 0;
  }

  return rawValue <= 1
    ? denormalizeQuestFeatureValue(rawValue)
    : Math.round(rawValue);
}

export function getEffectiveCapabilityValue(rawValue: number): number {
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 0;
  }

  if (rawValue <= 1) {
    return clampFeature(rawValue);
  }

  return clampFeature(rawValue / QUEST_RESOLUTION_TUNING.capabilityScaleMax);
}

function getPenaltyContribution(featureValue: number, share: number): number {
  return featureValue * QUEST_RESOLUTION_TUNING.totalPenaltyBudget * share;
}
