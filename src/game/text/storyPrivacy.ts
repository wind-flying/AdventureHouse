import type {StoryEntry} from "../core/types";

const ADVENTURER_PRIVATE_STORY_BADGES = new Set(["进食", "缺粮", "囤货", "路粮"]);

export function isAdventurerPrivateStoryEntry(entry: StoryEntry): boolean {
  return entry.badge !== null && ADVENTURER_PRIVATE_STORY_BADGES.has(entry.badge);
}
