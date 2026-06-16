import {INITIAL_DAY} from "../../state";
import {adventurerTextPoolsById} from "../../config";
import type {
  AdventurerDiscoveryLevel,
  AdventurerInstance,
  AdventurerOriginType,
  AdventurerRoleType,
  AdventurerSpawnMode,
  AdventurerTemplate,
  GameData,
  NamePoolDefinition,
  SavedAdventurer,
  SavedAdventurerV2,
  SavedAdventurerV3
} from "../../core/types";

const DISCOVERY_POINTS_BY_LEVEL: Record<AdventurerDiscoveryLevel, number> = {
  heard: 0,
  seen: 1,
  acquainted: 2,
  familiar: 4,
  trusted: 7
};

const GENERATED_VARIANCE = {
  personality: 0.12,
  capability: 8
} as const;

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
  originType: AdventurerOriginType = "handcrafted",
  instanceId = createAdventurerInstanceId(template.id, originType)
): AdventurerInstance {
  const roleType = getAdventurerRoleType(template);
  return {
    ...template,
    id: instanceId,
    instanceId,
    templateId: template.id,
    originType,
    roleType,
    knownLevel: template.knownByDefault ? template.discoveryLevel : "heard",
    acquaintancePoints: template.knownByDefault
      ? DISCOVERY_POINTS_BY_LEVEL[template.discoveryLevel]
      : DISCOVERY_POINTS_BY_LEVEL.heard,
    lastSeenDay: template.knownByDefault ? day : null,
    currentQuestId: null
  };
}

export function createHandcraftedAdventurerInstance(
  template: AdventurerTemplate,
  day: number
): AdventurerInstance {
  return createAdventurerInstanceFromTemplate(template, day, "handcrafted");
}

export function createGeneratedAdventurerInstance(
  template: AdventurerTemplate,
  day: number,
  seedKey: string,
  namePools: NamePoolDefinition[],
  instanceId = createAdventurerInstanceId(seedKey, "generated")
): AdventurerInstance {
  const generatedText = getGeneratedAdventurerText(template, seedKey);
  const personality = Object.fromEntries(
    Object.entries(template.personality).map(([axis, value]) => [
      axis,
      generateAxisValue(
        value,
        template.personalityRanges?.[axis as keyof typeof template.personalityRanges],
        `${seedKey}:${axis}:p`,
        GENERATED_VARIANCE.personality,
        -1,
        1
      )
    ])
  ) as AdventurerTemplate["personality"];
  const capabilities = Object.fromEntries(
    Object.entries(template.capabilities).map(([axis, value]) => [
      axis,
      Math.round(
        generateAxisValue(
          value,
          template.capabilityRanges?.[axis as keyof typeof template.capabilityRanges],
          `${seedKey}:${axis}:c`,
          GENERATED_VARIANCE.capability,
          0,
          100
        )
      )
    ])
  ) as AdventurerTemplate["capabilities"];

  return {
    ...createAdventurerInstanceFromTemplate(template, day, "generated", instanceId),
    name: getGeneratedAdventurerName(template, seedKey, namePools),
    title: generatedText.title,
    motive: generatedText.motive,
    impression: generatedText.impression,
    rumor: generatedText.rumor,
    personality,
    capabilities
  };
}

export interface InstantiateGeneratedAdventurerOptions {
  template?: AdventurerTemplate;
  templateId?: string;
  seedKey?: string;
}

export function instantiateGeneratedAdventurer(
  gameData: GameData,
  options: InstantiateGeneratedAdventurerOptions = {}
): AdventurerInstance | null {
  const templates = getAvailableGenerationTemplates(gameData);
  const template = options.template
    ?? (options.templateId ? templates.find((candidate) => candidate.id === options.templateId) : undefined)
    ?? templates[Math.floor(Math.random() * templates.length)];
  if (!template || !templates.some((candidate) => candidate.id === template.id)) {
    return null;
  }

  const instanceId = createGeneratedInstanceId(gameData.adventurerIdCounter);
  gameData.adventurerIdCounter += 1;
  const seedKey = options.seedKey ?? `${instanceId}:${template.id}:day-${gameData.day}`;
  const adventurer = createGeneratedAdventurerInstance(
    template,
    gameData.day,
    seedKey,
    gameData.namePools,
    instanceId
  );
  gameData.adventurers.unshift(adventurer);
  return adventurer;
}

export function getAvailableGenerationTemplates(gameData: GameData): AdventurerTemplate[] {
  return gameData.adventurerTemplates.filter((template) => {
    if (getAdventurerRoleType(template) !== "adventurer" || template.knownByDefault) {
      return false;
    }

    if (getAdventurerSpawnMode(template) === "repeatable") {
      return true;
    }

    return !gameData.adventurers.some((adventurer) => adventurer.templateId === template.id);
  });
}

export function createInitialAdventurerInstances(
  templates: AdventurerTemplate[],
  day = INITIAL_DAY
): AdventurerInstance[] {
  return templates
    .filter((template) => template.knownByDefault || getAdventurerRoleType(template) === "anchor")
    .map((template) => createHandcraftedAdventurerInstance(template, day));
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
    id: savedAdventurer.instanceId,
    instanceId: savedAdventurer.instanceId,
    templateId: savedAdventurer.templateId ?? null,
    originType: savedAdventurer.originType,
    roleType: savedAdventurer.roleType,
    acquaintancePoints,
    knownLevel: getDiscoveryLevelFromPoints(acquaintancePoints),
    lastSeenDay: getSafeNullableInteger(savedAdventurer.lastSeenDay),
    currentQuestId: getSafeNullableInteger(savedAdventurer.currentQuestId)
  };
}

export function restoreLegacySavedAdventurer(
  templates: AdventurerTemplate[],
  savedAdventurer: SavedAdventurerV2 | SavedAdventurerV3
): SavedAdventurer {
  const originType = savedAdventurer.originType;
  const fallbackKey = savedAdventurer.templateId ?? savedAdventurer.id;
  const template = savedAdventurer.templateId
    ? templates.find((adventurerTemplate) => adventurerTemplate.id === savedAdventurer.templateId) ?? null
    : null;
  const roleType = "roleType" in savedAdventurer
    ? savedAdventurer.roleType
    : (template ? getAdventurerRoleType(template) : "adventurer");

  return restoreAdventurerInstance(templates, {
    ...savedAdventurer,
    roleType,
    instanceId: createAdventurerInstanceId(fallbackKey, originType)
  });
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

function getGeneratedAdventurerName(
  template: AdventurerTemplate,
  seedKey: string,
  namePools: NamePoolDefinition[]
): string {
  const pool = template.namePoolId
    ? namePools.find((namePool) => namePool.id === template.namePoolId) ?? null
    : null;
  if (!pool || pool.surnames.length === 0 || pool.givenNames.length === 0) {
    return template.name;
  }

  const surname = pickSeeded(pool.surnames, `${seedKey}:surname`);
  const givenName = pickSeeded(pool.givenNames, `${seedKey}:given`);
  return `${surname}${givenName}`;
}

function getGeneratedAdventurerText(
  template: AdventurerTemplate,
  seedKey: string
): Pick<AdventurerTemplate, "title" | "motive" | "impression" | "rumor"> {
  const textPool = adventurerTextPoolsById[template.textId ?? template.id] ?? {};
  return {
    title: pickFlexibleTextValue(textPool.title, `${seedKey}:title`, template.title),
    motive: pickFlexibleTextValue(textPool.motive, `${seedKey}:motive`, template.motive),
    impression: pickFlexibleTextValue(textPool.impression, `${seedKey}:impression`, template.impression),
    rumor: pickFlexibleTextValue(textPool.rumor, `${seedKey}:rumor`, template.rumor)
  };
}

function generateAxisValue(
  baseValue: number,
  range: {min: number; max: number} | undefined,
  seedKey: string,
  fallbackAmplitude: number,
  minimum: number,
  maximum: number
): number {
  const effectiveRange = range ?? {
    min: baseValue - fallbackAmplitude,
    max: baseValue + fallbackAmplitude
  };

  const safeMin = clamp(effectiveRange.min, minimum, maximum);
  const safeMax = clamp(effectiveRange.max, minimum, maximum);
  if (safeMax <= safeMin) {
    return clamp(baseValue, minimum, maximum);
  }

  const center = clamp(baseValue, safeMin, safeMax);
  const centeredRatio = getCenteredRatio(seedKey);
  if (centeredRatio >= 0.5) {
    const upperRatio = (centeredRatio - 0.5) / 0.5;
    return lerp(center, safeMax, upperRatio);
  }

  const lowerRatio = centeredRatio / 0.5;
  return lerp(safeMin, center, lowerRatio);
}

function getCenteredRatio(seedKey: string): number {
  const random = createSeededRandom(seedKey);
  return (random() + random() + random()) / 3;
}

function pickFlexibleTextValue(
  value: string | string[] | undefined,
  seedKey: string,
  fallback: string
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fallback;
    }

    return pickSeeded(value, seedKey);
  }

  return value ?? fallback;
}

function pickSeeded<T>(items: T[], seedKey: string): T {
  const normalized = (normalizedSeed(seedKey) + 1) / 2;
  const index = Math.min(items.length - 1, Math.floor(normalized * items.length));
  return items[index];
}

function normalizedSeed(seedKey: string): number {
  return (hashSeed(seedKey) / 0xffffffff) * 2 - 1;
}

function hashSeed(seedKey: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seedKey.length; index += 1) {
    hash ^= seedKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}

function createSeededRandom(seedKey: string): () => number {
  let state = hashSeed(seedKey);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function createAdventurerInstanceId(sourceKey: string, originType: AdventurerOriginType): string {
  return originType === "generated"
    ? `generated:${sourceKey}`
    : `handcrafted:${sourceKey}`;
}

function createGeneratedInstanceId(counter: number): string {
  return `generated:${counter}`;
}

function getAdventurerRoleType(template: AdventurerTemplate): AdventurerRoleType {
  return template.roleType ?? "adventurer";
}

function getAdventurerSpawnMode(template: AdventurerTemplate): AdventurerSpawnMode {
  return template.spawnMode ?? (getAdventurerRoleType(template) === "anchor" ? "unique" : "repeatable");
}
