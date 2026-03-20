import {LOG_HISTORY_LIMIT} from "../state";
import {createStoryEntry} from "../text/storyText";
import {advanceQuestBoard} from "./taskBoard";
import type {GameData, StoryEntry} from "../types";

export function advanceDay(gameData: GameData): void {
  gameData.day += 1;
  gameData.player.money += gameData.dailyShopIncome;

  const nextDayEntries: StoryEntry[] = [
    createStoryEntry("daily_income", {
      day: gameData.day,
      income: gameData.dailyShopIncome
    })
  ];

  advanceQuestBoard(gameData, nextDayEntries);

  if (gameData.player.quests.length === 0) {
    nextDayEntries.push(
      createStoryEntry("quiet_day", {
        day: gameData.day
      })
    );
  }

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
    .filter((entry) => entry.day === gameData.day)
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
    case "出发":
      return 40;
    case "推进":
      return 10;
    default:
      return 0;
  }
}
