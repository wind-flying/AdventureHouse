import {
  QUEST_RESOLUTION_TUNING,
  getEffectiveCapabilityValue,
  getQuestCapabilityWeights,
  getQuestResolutionInput,
  getWeightedCapabilityScore,
  normalizeQuestFeatures
} from "./taskResolution.js";
import type {Adventurer, GameData, Quest, QuestTemplate} from "../../core/types.js";

export const QUEST_ACCEPTANCE_TUNING = {
  randomVariance: {
    publicTask: 0.22,
    selectiveTask: 0.08
  },
  candidateWindow: {
    publicTask: 0.58,
    selectiveTask: 0.2
  },
  rewardPerDayBaseline: 4.5,
  rewardCurveStrength: 1.25,
  preferredResourceBonus: 0.65,
  subjectiveFitWeight: 1.05,
  subjectiveCapabilityWeight: 0.85,
  subjectiveConfidenceWeight: {
    courageCombatBonus: 1.3,
    courageDangerBonus: 0.6,
    curiosityInvestigationBonus: 0.85,
    cautionDangerConcern: 0.4,
    cautionUncertaintyConcern: 0.35
  },
  subjectiveRiskCurve: {
    dangerExponent: 1.35,
    uncertaintyExponent: 1.2
  },
  diligence: {
    routineTaskBonus: 0.65,
    nonRoutineTaskBonus: 0.18
  },
  greedRewardWeight: 0.85,
  sociabilityFactor: 0.08,
  curiosity: {
    mysteriousTaskBonus: 0.18,
    investigationTaskBonus: 0.28,
    ordinaryTaskWeight: 0.03,
    combatSuppressionWeight: 0.18
  },
  discipline: {
    shortTaskCenterDays: 2,
    shortTaskSlopeDays: 0.58,
    shortTaskBonus: 0.28,
    longTaskPenalty: 0.34,
    longTaskPenaltyStartDays: 2.8,
    longTaskPenaltySlopeDays: 0.55
  },
  resilience: {
    longTaskCenterDays: 3.8,
    longTaskSlopeDays: 0.85,
    longTaskBonus: 0.2,
    shortTaskPenalty: 0.04,
    shortTaskPenaltyCenterDays: 1.8,
    shortTaskPenaltySlopeDays: 0.7
  }
} as const;

export const QUEST_INTEREST_TUNING = {
  baseThreshold: 0.42,
  personality: {
    diligenceThresholdFactor: -0.1,
    greedThresholdFactor: -0.12,
    cautionThresholdFactor: 0.12,
    sociabilityThresholdFactor: -0.04,
    disciplineThresholdFactor: -0.05
  },
  taskAware: {
    courageCombatFactor: -0.08,
    courageDangerFactor: -0.05,
    disciplineShortTaskFactor: -0.05,
    disciplineLongTaskFactor: 0.22,
    resilienceLongTaskFactor: -0.06,
    cautionDangerFactor: 0.12,
    cautionUncertaintyFactor: 0.08,
    curiosityInvestigationFactor: -0.05,
    curiosityCombatSuppressionFactor: 0.09,
    greedRewardFactor: -0.07
  },
  recency: {
    sameDayFinishedPenalty: 0.55,
    oneDayAgoFinishedPenalty: 0.3,
    idleBonusAfterDays: 2,
    idleThresholdReduction: 0.18
  }
} as const;

export interface QuestAcceptanceBreakdown {
  rewardPerDay: number;
  resourcePreferenceBonus: number;
  diligenceBonus: number;
  greedBonus: number;
  sociabilityBonus: number;
  curiosityBonus: number;
  disciplineBonus: number;
  resilienceBonus: number;
  capabilityFit: number;
  confidenceBias: number;
  riskConcern: number;
  subjectiveFit: number;
  randomNoise: number;
  finalScore: number;
}

export interface QuestInterestBreakdown {
  baseThreshold: number;
  diligenceAdjustment: number;
  greedAdjustment: number;
  cautionAdjustment: number;
  sociabilityAdjustment: number;
  disciplineAdjustment: number;
  taskAdjustment: number;
  recencyAdjustment: number;
  finalThreshold: number;
}

export function filterAdventurersForQuestTemplate(
  template: QuestTemplate | undefined,
  adventurers: Adventurer[]
): Adventurer[] {
  const exclusiveTemplateId = template?.exclusiveTakerTemplateId;
  if (!exclusiveTemplateId) {
    return adventurers;
  }

  return adventurers.filter((adventurer) => adventurer.templateId === exclusiveTemplateId);
}

export function chooseAdventurerForQuest(
  gameData: GameData,
  quest: Quest,
  template: QuestTemplate | undefined,
  availableAdventurers: Adventurer[]
): Adventurer | null {
  const eligibleAdventurers = filterAdventurersForQuestTemplate(template, availableAdventurers);
  if (eligibleAdventurers.length === 0) {
    return null;
  }

  const acceptanceProfile = getQuestAcceptanceProfile(quest, template);
  const randomVariance = interpolateByTaskOpenness(
    QUEST_ACCEPTANCE_TUNING.randomVariance.selectiveTask,
    QUEST_ACCEPTANCE_TUNING.randomVariance.publicTask,
    acceptanceProfile.publicOpenness
  );
  const weightedAdventurers = eligibleAdventurers
    .map((adventurer) => {
      const score = getQuestAcceptanceBreakdown(
        gameData,
        quest,
        template,
        adventurer,
        getCenteredNoise(randomVariance)
      ).finalScore;
      const threshold = getQuestInterestBreakdown(gameData, adventurer, quest, template).finalThreshold;
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
  const candidateWindow = interpolateByTaskOpenness(
    QUEST_ACCEPTANCE_TUNING.candidateWindow.selectiveTask,
    QUEST_ACCEPTANCE_TUNING.candidateWindow.publicTask,
    acceptanceProfile.publicOpenness
  );
  const candidates = weightedAdventurers.filter(
    ({score}) => score >= bestScore - candidateWindow
  );
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index]?.adventurer ?? null;
}

export function getQuestAcceptanceBreakdown(
  gameData: GameData,
  quest: Quest,
  template: QuestTemplate | undefined,
  adventurer: Adventurer,
  randomNoise = 0
): QuestAcceptanceBreakdown {
  const rewardPerDay = quest.reward / Math.max(1, quest.totalDays);
  const acceptanceProfile = getQuestAcceptanceProfile(quest, template);
  const shortTaskAffinity = getDescendingSigmoid(
    quest.totalDays,
    QUEST_ACCEPTANCE_TUNING.discipline.shortTaskCenterDays,
    QUEST_ACCEPTANCE_TUNING.discipline.shortTaskSlopeDays
  );
  const longTaskAffinity = getAscendingSigmoid(
    quest.totalDays,
    QUEST_ACCEPTANCE_TUNING.resilience.longTaskCenterDays,
    QUEST_ACCEPTANCE_TUNING.resilience.longTaskSlopeDays
  );
  const disciplineLongTaskPenalty = getAscendingSigmoid(
    quest.totalDays,
    QUEST_ACCEPTANCE_TUNING.discipline.longTaskPenaltyStartDays,
    QUEST_ACCEPTANCE_TUNING.discipline.longTaskPenaltySlopeDays
  );
  const resilienceShortTaskPenalty = getDescendingSigmoid(
    quest.totalDays,
    QUEST_ACCEPTANCE_TUNING.resilience.shortTaskPenaltyCenterDays,
    QUEST_ACCEPTANCE_TUNING.resilience.shortTaskPenaltySlopeDays
  );
  const resourcePreferenceBonus = quest.resource && adventurer.preferences.includes(quest.resource)
    ? QUEST_ACCEPTANCE_TUNING.preferredResourceBonus
    : 0;
  const diligenceTaskWeight =
    QUEST_ACCEPTANCE_TUNING.diligence.nonRoutineTaskBonus
    + (
      QUEST_ACCEPTANCE_TUNING.diligence.routineTaskBonus
      - QUEST_ACCEPTANCE_TUNING.diligence.nonRoutineTaskBonus
    ) * acceptanceProfile.routineSignal;
  const diligenceBonus = adventurer.personality.diligence * diligenceTaskWeight;
  const greedBonus = adventurer.personality.greed
    * normalizeRelativeValue(
      rewardPerDay / QUEST_ACCEPTANCE_TUNING.rewardPerDayBaseline,
      QUEST_ACCEPTANCE_TUNING.rewardCurveStrength
    )
    * QUEST_ACCEPTANCE_TUNING.greedRewardWeight;
  const sociabilityBonus = adventurer.personality.sociability * QUEST_ACCEPTANCE_TUNING.sociabilityFactor;
  const curiosityBonus = adventurer.personality.curiosity * (
    QUEST_ACCEPTANCE_TUNING.curiosity.ordinaryTaskWeight
    + acceptanceProfile.investigationSignal * QUEST_ACCEPTANCE_TUNING.curiosity.investigationTaskBonus
    + acceptanceProfile.anomalySignal * QUEST_ACCEPTANCE_TUNING.curiosity.mysteriousTaskBonus
    - acceptanceProfile.combatSignal * QUEST_ACCEPTANCE_TUNING.curiosity.combatSuppressionWeight
  );
  const disciplineBonus = adventurer.personality.discipline
    * (
      shortTaskAffinity * QUEST_ACCEPTANCE_TUNING.discipline.shortTaskBonus
      - disciplineLongTaskPenalty
        * acceptanceProfile.durationDemand
        * QUEST_ACCEPTANCE_TUNING.discipline.longTaskPenalty
    );
  const resilienceBonus = adventurer.personality.resilience
    * (
      longTaskAffinity
        * acceptanceProfile.durationDemand
        * QUEST_ACCEPTANCE_TUNING.resilience.longTaskBonus
      - resilienceShortTaskPenalty * QUEST_ACCEPTANCE_TUNING.resilience.shortTaskPenalty
    );

  const subjectiveFit = getQuestSubjectiveFit(quest, template, adventurer);

  return {
    rewardPerDay,
    resourcePreferenceBonus,
    diligenceBonus,
    greedBonus,
    sociabilityBonus,
    curiosityBonus,
    disciplineBonus,
    resilienceBonus,
    capabilityFit: subjectiveFit.capabilityFit,
    confidenceBias: subjectiveFit.confidenceBias,
    riskConcern: subjectiveFit.riskConcern,
    subjectiveFit: subjectiveFit.subjectiveFit,
    randomNoise,
    finalScore:
      resourcePreferenceBonus
      + diligenceBonus
      + greedBonus
      + sociabilityBonus
      + curiosityBonus
      + disciplineBonus
      + resilienceBonus
      + (subjectiveFit.subjectiveFit * QUEST_ACCEPTANCE_TUNING.subjectiveFitWeight)
      + randomNoise
  };
}

export function getQuestInterestBreakdown(
  gameData: GameData,
  adventurer: Adventurer,
  quest?: Quest,
  template?: QuestTemplate
): QuestInterestBreakdown {
  const diligenceAdjustment = adventurer.personality.diligence * QUEST_INTEREST_TUNING.personality.diligenceThresholdFactor;
  const greedAdjustment = adventurer.personality.greed * QUEST_INTEREST_TUNING.personality.greedThresholdFactor;
  const cautionAdjustment = adventurer.personality.caution * QUEST_INTEREST_TUNING.personality.cautionThresholdFactor;
  const sociabilityAdjustment = adventurer.personality.sociability * QUEST_INTEREST_TUNING.personality.sociabilityThresholdFactor;
  const disciplineAdjustment = adventurer.personality.discipline * QUEST_INTEREST_TUNING.personality.disciplineThresholdFactor;
  const taskAdjustment = getTaskAwareThresholdAdjustment(adventurer, quest, template);
  const recencyAdjustment = getQuestRecencyAdjustment(gameData, adventurer);

  return {
    baseThreshold: QUEST_INTEREST_TUNING.baseThreshold,
    diligenceAdjustment,
    greedAdjustment,
    cautionAdjustment,
    sociabilityAdjustment,
    disciplineAdjustment,
    taskAdjustment,
    recencyAdjustment,
    finalThreshold:
      QUEST_INTEREST_TUNING.baseThreshold
      + diligenceAdjustment
      + greedAdjustment
      + cautionAdjustment
      + sociabilityAdjustment
      + disciplineAdjustment
      + taskAdjustment
      + recencyAdjustment
  };
}

function getQuestSubjectiveFit(
  quest: Quest,
  template: QuestTemplate | undefined,
  adventurer: Adventurer
) {
  if (!template) {
    return {
      capabilityFit: 0,
      confidenceBias: 0,
      riskConcern: 0,
      subjectiveFit: 0
    };
  }

  const resolutionInput = getQuestResolutionInput(quest, template);
  const normalizedFeatures = normalizeQuestFeatures(resolutionInput.features);
  const acceptanceProfile = getQuestAcceptanceProfile(quest, template);
  const weightedCapability = getWeightedCapabilityScore({
    ...resolutionInput,
    features: normalizedFeatures
  }, adventurer);
  const capabilityWeights = getQuestCapabilityWeights({
    ...resolutionInput,
    features: normalizedFeatures
  });
  const totalCapabilityWeight = Object.values(capabilityWeights).reduce<number>((sum, value) => sum + value, 0) || 1;
  const combatRelevance = capabilityWeights.combat / totalCapabilityWeight;
  const investigationRelevance = (capabilityWeights.exploration + capabilityWeights.observation) / totalCapabilityWeight;
  const combatCapabilityGap = Math.max(
    0,
    getEffectiveCapabilityValue(adventurer.capabilities.combat) - QUEST_RESOLUTION_TUNING.capabilityCenter
  );
  const investigationCapabilityGap = Math.max(
    0,
    (((getEffectiveCapabilityValue(adventurer.capabilities.exploration)
      + getEffectiveCapabilityValue(adventurer.capabilities.observation)) / 2)
      - QUEST_RESOLUTION_TUNING.capabilityCenter)
  );
  const capabilityFit = (weightedCapability - QUEST_RESOLUTION_TUNING.capabilityCenter)
    * QUEST_ACCEPTANCE_TUNING.subjectiveCapabilityWeight;
  const confidenceBias =
    (adventurer.personality.courage
      * combatRelevance
      * acceptanceProfile.combatSignal
      * combatCapabilityGap
      * QUEST_ACCEPTANCE_TUNING.subjectiveConfidenceWeight.courageCombatBonus)
    + (adventurer.personality.courage
      * normalizedFeatures.danger
      * Math.max(0, weightedCapability - QUEST_RESOLUTION_TUNING.capabilityCenter)
      * QUEST_ACCEPTANCE_TUNING.subjectiveConfidenceWeight.courageDangerBonus)
    + (adventurer.personality.curiosity
      * investigationRelevance
      * acceptanceProfile.investigationSignal
      * investigationCapabilityGap
      * QUEST_ACCEPTANCE_TUNING.subjectiveConfidenceWeight.curiosityInvestigationBonus);
  const riskConcern =
    (adventurer.personality.caution
      * applyRiskCurve(
        normalizedFeatures.danger,
        QUEST_ACCEPTANCE_TUNING.subjectiveRiskCurve.dangerExponent
      )
      * QUEST_ACCEPTANCE_TUNING.subjectiveConfidenceWeight.cautionDangerConcern)
    + (adventurer.personality.caution
      * applyRiskCurve(
        normalizedFeatures.uncertainty,
        QUEST_ACCEPTANCE_TUNING.subjectiveRiskCurve.uncertaintyExponent
      )
      * QUEST_ACCEPTANCE_TUNING.subjectiveConfidenceWeight.cautionUncertaintyConcern);

  return {
    capabilityFit,
    confidenceBias,
    riskConcern,
    subjectiveFit: capabilityFit + confidenceBias - riskConcern
  };
}

function getQuestAcceptanceProfile(quest: Quest, template: QuestTemplate | undefined) {
  if (!template) {
    return {
      investigationSignal: quest.nature === "investigation" ? 0.55 : 0,
      anomalySignal: quest.nature === "mysterious" ? 0.55 : 0,
      combatSignal: quest.risk === "dangerous" ? 0.55 : quest.risk === "risky" ? 0.25 : 0,
      publicOpenness: quest.risk === "safe" ? 0.8 : quest.risk === "risky" ? 0.5 : 0.2,
      routineSignal: quest.nature === "routine" || quest.nature === "supply" ? 0.7 : 0.2,
      durationDemand: getAscendingSigmoid(quest.totalDays, 3.5, 0.8),
      shortTaskAffinity: getDescendingSigmoid(quest.totalDays, 2, 0.58)
    };
  }

  const resolutionInput = getQuestResolutionInput(quest, template);
  const normalizedFeatures = normalizeQuestFeatures(resolutionInput.features);
  const capabilityWeights = getQuestCapabilityWeights({
    ...resolutionInput,
    features: normalizedFeatures
  });
  const totalCapabilityWeight = Object.values(capabilityWeights).reduce<number>((sum, value) => sum + value, 0) || 1;
  const combatRelevance = capabilityWeights.combat / totalCapabilityWeight;
  const investigationRelevance = (capabilityWeights.exploration + capabilityWeights.observation) / totalCapabilityWeight;
  const investigationSignal = clamp01(
    investigationRelevance * 0.4
    + normalizedFeatures.investigationComplexity * 0.35
    + normalizedFeatures.reportDifficulty * 0.15
    + normalizedFeatures.uncertainty * 0.1
  );
  const anomalySignal = clamp01(
    investigationSignal * 0.45
    + normalizedFeatures.uncertainty * 0.3
    + (1 - normalizedFeatures.stability) * 0.25
  );
  const combatSignal = clamp01(
    combatRelevance * 0.45
    + normalizedFeatures.danger * 0.4
    + normalizedFeatures.challenge * 0.15
  );
  const publicOpenness = clamp01(
    (1 - normalizedFeatures.danger) * 0.24
    + (1 - normalizedFeatures.challenge) * 0.12
    + (1 - normalizedFeatures.uncertainty) * 0.14
    + normalizedFeatures.stability * 0.18
    + (quest.nature === "routine" || quest.nature === "supply" ? 0.2 : 0)
    + (quest.risk === "safe" ? 0.12 : quest.risk === "risky" ? 0.04 : 0)
    - normalizedFeatures.durationPressure * 0.12
  );
  const routineSignal = clamp01(
    (quest.nature === "routine" || quest.nature === "supply" ? 0.72 : 0.12)
    + normalizedFeatures.stability * 0.18
    - normalizedFeatures.durationPressure * 0.38
    - normalizedFeatures.uncertainty * 0.16
    - normalizedFeatures.danger * 0.08
  );
  const durationDemand = clamp01(
    getAscendingSigmoid(quest.totalDays, 3.4, 0.8) * 0.55
    + normalizedFeatures.durationPressure * 0.45
  );
  const shortTaskAffinity = getDescendingSigmoid(quest.totalDays, 2, 0.58);

  return {
    investigationSignal,
    anomalySignal,
    combatSignal,
    publicOpenness,
    routineSignal,
    durationDemand,
    shortTaskAffinity
  };
}

function getTaskAwareThresholdAdjustment(
  adventurer: Adventurer,
  quest: Quest | undefined,
  template: QuestTemplate | undefined
) {
  if (!quest) {
    return 0;
  }

  const acceptanceProfile = getQuestAcceptanceProfile(quest, template);
  const rewardPerDay = quest.reward / Math.max(1, quest.totalDays);
  const rewardSignal = clamp01(normalizeRelativeValue(
    rewardPerDay / QUEST_ACCEPTANCE_TUNING.rewardPerDayBaseline,
    QUEST_ACCEPTANCE_TUNING.rewardCurveStrength
  ));

  return (
    adventurer.personality.discipline * (
      acceptanceProfile.shortTaskAffinity * QUEST_INTEREST_TUNING.taskAware.disciplineShortTaskFactor
      + acceptanceProfile.durationDemand * QUEST_INTEREST_TUNING.taskAware.disciplineLongTaskFactor
    )
    + adventurer.personality.courage * (
      acceptanceProfile.combatSignal * QUEST_INTEREST_TUNING.taskAware.courageCombatFactor
      + acceptanceProfile.anomalySignal * QUEST_INTEREST_TUNING.taskAware.courageDangerFactor
    )
    + adventurer.personality.resilience
      * acceptanceProfile.durationDemand
      * QUEST_INTEREST_TUNING.taskAware.resilienceLongTaskFactor
    + adventurer.personality.caution * (
      acceptanceProfile.combatSignal * QUEST_INTEREST_TUNING.taskAware.cautionDangerFactor
      + acceptanceProfile.anomalySignal * QUEST_INTEREST_TUNING.taskAware.cautionUncertaintyFactor
    )
    + adventurer.personality.curiosity * (
      acceptanceProfile.investigationSignal * QUEST_INTEREST_TUNING.taskAware.curiosityInvestigationFactor
      + acceptanceProfile.combatSignal * QUEST_INTEREST_TUNING.taskAware.curiosityCombatSuppressionFactor
    )
    + adventurer.personality.greed
      * rewardSignal
      * QUEST_INTEREST_TUNING.taskAware.greedRewardFactor
  );
}

function getQuestRecencyAdjustment(gameData: GameData, adventurer: Adventurer) {
  const latestQuestDay = getLatestQuestActivityDay(gameData, adventurer);
  if (latestQuestDay === null) {
    return 0;
  }

  const daysSinceLastQuest = gameData.day - latestQuestDay;

  if (daysSinceLastQuest <= 0) {
    return QUEST_INTEREST_TUNING.recency.sameDayFinishedPenalty;
  }

  if (daysSinceLastQuest === 1) {
    return QUEST_INTEREST_TUNING.recency.oneDayAgoFinishedPenalty;
  }

  if (daysSinceLastQuest >= QUEST_INTEREST_TUNING.recency.idleBonusAfterDays) {
    return -QUEST_INTEREST_TUNING.recency.idleThresholdReduction;
  }

  return 0;
}

function getLatestQuestActivityDay(gameData: GameData, adventurer: Adventurer): number | null {
  let latestDay: number | null = null;

  gameData.player.quests.forEach((quest: Quest) => {
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

function normalizeRelativeValue(value: number, curveStrength: number): number {
  return Math.tanh((value - 1) * curveStrength);
}

function getAscendingSigmoid(value: number, center: number, slope: number): number {
  return 1 / (1 + Math.exp(-(value - center) / Math.max(0.001, slope)));
}

function getDescendingSigmoid(value: number, center: number, slope: number): number {
  return 1 - getAscendingSigmoid(value, center, slope);
}

function applyRiskCurve(value: number, exponent: number): number {
  return Math.pow(Math.max(0, Math.min(1, value)), exponent);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function interpolateByTaskOpenness(selectiveValue: number, publicValue: number, publicOpenness: number) {
  return selectiveValue + ((publicValue - selectiveValue) * clamp01(publicOpenness));
}

function getCenteredNoise(variance: number) {
  return (Math.random() - 0.5) * 2 * variance;
}
