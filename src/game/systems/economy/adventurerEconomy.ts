import type {Adventurer, GameData} from "../../core/types";

const ADVENTURER_ECONOMY_TUNING = {
  brokeThreshold: 3,
  comfortableThreshold: 12,
  brokeThresholdReduction: 0.14,
  wealthyThresholdIncrease: 0.08,
  questRewardPayoutRatio: 1,
  brokeGreedBoost: 0.12
} as const;

export function payAdventurerQuestReward(gameData: GameData, adventurer: Adventurer, reward: number): void {
  if (!Number.isInteger(reward) || reward <= 0) {
    return;
  }

  const payout = Math.round(reward * ADVENTURER_ECONOMY_TUNING.questRewardPayoutRatio);
  adventurer.carriedMoney += payout;
}

export function applyDailyAdventurerLivingCosts(gameData: GameData): void {
  const dailyCost = gameData.establishment.adventurerDailyLivingCost;
  if (!Number.isInteger(dailyCost) || dailyCost <= 0) {
    return;
  }

  gameData.adventurers.forEach((adventurer) => {
    if (adventurer.knownLevel === "heard") {
      return;
    }

    adventurer.carriedMoney = Math.max(0, adventurer.carriedMoney - dailyCost);
  });
}

export function getAdventurerEconomicPressure(adventurer: Adventurer): number {
  if (adventurer.carriedMoney <= ADVENTURER_ECONOMY_TUNING.brokeThreshold) {
    return -1;
  }

  if (adventurer.carriedMoney >= ADVENTURER_ECONOMY_TUNING.comfortableThreshold) {
    return 1;
  }

  return 0;
}

export function getEconomicInterestAdjustment(adventurer: Adventurer): number {
  const pressure = getAdventurerEconomicPressure(adventurer);
  if (pressure < 0) {
    return -ADVENTURER_ECONOMY_TUNING.brokeThresholdReduction;
  }

  if (pressure > 0) {
    return ADVENTURER_ECONOMY_TUNING.wealthyThresholdIncrease;
  }

  return 0;
}

export function getEconomicAcceptanceBoost(adventurer: Adventurer): number {
  if (getAdventurerEconomicPressure(adventurer) < 0) {
    return ADVENTURER_ECONOMY_TUNING.brokeGreedBoost;
  }

  return 0;
}

export function getFoodDeficitAcceptanceBoost(gameData: GameData, adventurer: Adventurer): number {
  if (adventurer.foodDeficitStreak <= 0) {
    return 0;
  }

  const tuning = gameData.dailyNeedsConfig.categories.food;
  let boost = adventurer.foodDeficitStreak * tuning.deficitAcceptanceBoostPerDay;
  if (adventurer.daysWithoutQuestWhileDeficit >= tuning.noQuestStreakThresholdDays) {
    boost += tuning.deficitNoQuestExtraBoost;
  }

  return boost;
}

export function getAdventurerFinanceGiftScore(adventurer: Adventurer): number {
  const pressure = getAdventurerEconomicPressure(adventurer);
  if (pressure < 0) {
    return 0.85;
  }

  if (pressure > 0) {
    return 0.25;
  }

  return 0.5;
}
