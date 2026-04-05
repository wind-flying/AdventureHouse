import {INITIAL_DAY} from "../../state";
import type {
  AdventurerDiscoveryLevel,
  AdventurerInstance,
  AdventurerOriginType,
  AdventurerTemplate,
  SavedAdventurer
} from "../../core/types";

const DISCOVERY_POINTS_BY_LEVEL: Record<AdventurerDiscoveryLevel, number> = {
  heard: 0,
  seen: 1,
  acquainted: 2,
  familiar: 4,
  trusted: 7
};

export function getDiscoveryLevelFromPoints(points: number): AdventurerDiscoveryLevel {
  if (points >= DISCOVERY_POINTS_BY_LEVEL.trusted) {
    return "trusted";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.familiar) {
    return "familiar";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.acquainted) {
    return "acquainted";
  }

  if (points >= DISCOVERY_POINTS_BY_LEVEL.seen) {
    return "seen";
  }

  return "heard";
}

export function createAdventurerInstanceFromTemplate(
  template: AdventurerTemplate,
  day: number,
  originType: AdventurerOriginType = "handcrafted"
): AdventurerInstance {
  return {
    ...template,
    templateId: template.id,
    originType,
    knownLevel: template.knownByDefault ? template.discoveryLevel : "heard",
    acquaintancePoints: template.knownByDefault
      ? DISCOVERY_POINTS_BY_LEVEL[template.discoveryLevel]
      : DISCOVERY_POINTS_BY_LEVEL.heard,
    lastSeenDay: template.knownByDefault ? day : null,
    currentQuestId: null
  };
}

export function createInitialAdventurerInstances(
  templates: AdventurerTemplate[],
  day = INITIAL_DAY
): AdventurerInstance[] {
  return templates.map((template) => createAdventurerInstanceFromTemplate(template, day));
}

export function restoreAdventurerInstance(
  templates: AdventurerTemplate[],
  savedAdventurer: SavedAdventurer
): AdventurerInstance {
  const template = savedAdventurer.templateId
    ? templates.find((adventurerTemplate) => adventurerTemplate.id === savedAdventurer.templateId) ?? null
    : null;
  const baseAdventurer = template
    ? createAdventurerInstanceFromTemplate(template, INITIAL_DAY, savedAdventurer.originType)
    : null;
  const acquaintancePoints = getSafeInteger(
    savedAdventurer.acquaintancePoints,
    baseAdventurer?.acquaintancePoints ?? 0
  );

  return {
    ...(baseAdventurer ?? savedAdventurer),
    ...savedAdventurer,
    templateId: savedAdventurer.templateId ?? null,
    originType: savedAdventurer.originType,
    acquaintancePoints,
    knownLevel: getDiscoveryLevelFromPoints(acquaintancePoints),
    lastSeenDay: getSafeNullableInteger(savedAdventurer.lastSeenDay),
    currentQuestId: getSafeNullableInteger(savedAdventurer.currentQuestId)
  };
}

export function restoreLegacyAdventurerState(
  baseAdventurer: AdventurerInstance,
  legacyState: {
    acquaintancePoints: number;
    lastSeenDay: number | null;
    currentQuestId: number | null;
  } | null
): AdventurerInstance {
  if (!legacyState) {
    return {...baseAdventurer};
  }

  const acquaintancePoints = getSafeInteger(legacyState.acquaintancePoints, baseAdventurer.acquaintancePoints);
  return {
    ...baseAdventurer,
    acquaintancePoints,
    knownLevel: getDiscoveryLevelFromPoints(acquaintancePoints),
    lastSeenDay: getSafeNullableInteger(legacyState.lastSeenDay),
    currentQuestId: getSafeNullableInteger(legacyState.currentQuestId)
  };
}

function getSafeInteger(value: number, fallback: number): number {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return value;
}

function getSafeNullableInteger(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value) ? value : null;
}
