import {LOG_HISTORY_LIMIT} from "../state";
import {createStoryEntry} from "../text/storyText";
import {isAdventurerPrivateStoryEntry} from "../text/storyPrivacy";
import {advanceAdventurerAppearance} from "./adventurers/adventurerAppearance";
import {expireAdventurerBuffs} from "./adventurers/adventurerBuffs";
import {
  resolveDailyFoodNeeds,
  updateDaysWithoutQuestWhileDeficit
} from "./adventurers/foodAllocation";
import {resolveOptionalFoodStockpile} from "./adventurers/foodStockpile";
import {tryTriggerBailoutOffer, updateBailoutTracking} from "./economy/bailout";
import {simulateDailyInnRetail} from "./economy/innRetail";
import {advanceQuestBoard} from "./quests/taskBoard";
import type {GameData, StoryEntry} from "../core/types";

export function advanceDay(gameData: GameData): void {
  gameData.day += 1;
  expireAdventurerBuffs(gameData);

  const nextDayEntries: StoryEntry[] = [];

  resolveDailyFoodNeeds(gameData, nextDayEntries);
  resolveOptionalFoodStockpile(gameData, nextDayEntries);
  advanceQuestBoard(gameData, nextDayEntries);
  updateDaysWithoutQuestWhileDeficit(gameData);

  const retailIncome = simulateDailyInnRetail(gameData, nextDayEntries);
  if (retailIncome > 0) {
    nextDayEntries.push(
      createStoryEntry("daily_retail_income", {
        day: gameData.day,
        income: retailIncome
      })
    );
  }

  advanceAdventurerAppearance(gameData, nextDayEntries);

  if (gameData.player.quests.length === 0) {
    nextDayEntries.push(
      createStoryEntry("quiet_day", {
        day: gameData.day
      })
    );
  }

  updateBailoutTracking(gameData);
  tryTriggerBailoutOffer(gameData);

  gameData.dayLog = [...nextDayEntries, ...gameData.dayLog].slice(0, LOG_HISTORY_LIMIT);
}

export function getActiveQuestCount(gameData: GameData): number {
  return gameData.player.quests.filter((quest) => quest.status === "active").length;
}

export function getTotalStock(gameData: GameData): number {
  return Object.values(gameData.player.stock).reduce((sum, value) => sum + value, 0);
}

export function getLatestDayEntries(gameData: GameData): StoryEntry[] {
  return gameData.dayLog
    .filter((entry) => entry.day === gameData.day && !isAdventurerPrivateStoryEntry(entry))
    .sort((left, right) => getStoryEntryPriority(right) - getStoryEntryPriority(left));
}

function getStoryEntryPriority(entry: StoryEntry): number {
  switch (entry.badge) {
    case "完成":
    case "失手":
      return 100;
    case "线索":
    case "发现":
      return 90;
    case "后续":
      return 85;
    case "收益":
      return 75;
    case "委托":
      return 65;
    case "新面孔":
      return 55;
    case "出发":
      return 40;
    case "推进":
      return 10;
    default:
      return 0;
  }
}
