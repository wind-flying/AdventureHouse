import type {Adventurer} from "../core/types";
import {escapeHtml} from "../ui/equipmentDisplay";

export function getAdventurerFoodTalkLines(adventurer: Adventurer): string[] {
  const lines: string[] = [];

  if (adventurer.foodDeficitStreak >= 3 && adventurer.roleType === "anchor") {
    lines.push("「店主，这几天老差那么一口……再这样下去，我可没力气帮你撑场面了。」");
  } else if (adventurer.foodDeficitStreak >= 2) {
    lines.push(`「最近 ${adventurer.foodDeficitStreak} 天都没怎么吃饱饭。」`);
  } else if (adventurer.foodDeficitStreak === 1) {
    lines.push("「今天还没吃够。」");
  }

  if (adventurer.dailyFoodTalkNote) {
    lines.push(adventurer.dailyFoodTalkNote);
  }

  return lines;
}

export function buildAdventurerFoodTalkMarkup(adventurer: Adventurer): string {
  const lines = getAdventurerFoodTalkLines(adventurer);
  if (lines.length === 0) {
    return "";
  }

  return lines
    .map((line) => `<p class="loadout-food-line">${escapeHtml(line)}</p>`)
    .join("");
}

export function buildDailyFoodTalkNote(sourceText: string, itemName: string): string {
  if (sourceText === "背包") {
    return `今天先用背包里的${itemName}对付了一顿。`;
  }

  return `今天在${sourceText}吃了${itemName}。`;
}
