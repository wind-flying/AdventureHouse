import type {GameData, Quest, QuestTemplate, ResourceDefinition} from "../types";

interface ResourceDisplayFallback {
  name?: string;
  icon?: string;
}

export function getResourceDefinition(gameData: GameData, resourceId: string): ResourceDefinition | undefined {
  return gameData.resources.find((resource) => resource.id === resourceId);
}

export function getResourceName(
  gameData: GameData,
  resourceId: string,
  fallback: ResourceDisplayFallback = {}
): string {
  return getResourceDefinition(gameData, resourceId)?.name ?? fallback.name ?? resourceId;
}

export function getResourceIcon(
  gameData: GameData,
  resourceId: string,
  fallback: ResourceDisplayFallback = {}
): string {
  return getResourceDefinition(gameData, resourceId)?.icon ?? fallback.icon ?? "";
}

export function getResourceLabel(
  gameData: GameData,
  resourceId: string,
  fallback: ResourceDisplayFallback = {}
): string {
  const icon = getResourceIcon(gameData, resourceId, fallback);
  const name = getResourceName(gameData, resourceId, fallback);
  return icon ? `${icon} ${name}` : name;
}

export function getQuestResourceLabel(gameData: GameData, quest: Quest): string {
  if (quest.focusText) {
    return quest.focusText;
  }

  if (!quest.resource) {
    return "未命名目标";
  }

  const icon = getResourceIcon(gameData, quest.resource);
  const name = getResourceName(gameData, quest.resource);
  return `${icon}${name}`;
}

export function getQuestTemplateFocusLabel(gameData: GameData, template: QuestTemplate): string {
  if (template.focusText) {
    return template.focusText;
  }

  if (template.resource) {
    return getResourceLabel(gameData, template.resource);
  }

  return template.title;
}

export function formatResourcePreferences(gameData: GameData, resourceIds: string[]): string {
  return resourceIds.map((resourceId) => getResourceLabel(gameData, resourceId)).join(" / ");
}
