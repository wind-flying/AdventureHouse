import {createStoryEntry} from "../../text/storyText";
import {intelTextPoolsById} from "../../config";
import {getQuestResourceLabel} from "../../ui/resourceDisplay";
import {getUnlockedTemplatesFromQuestResolution} from "./questUnlocks";
import {getQuestCapabilityWeights, getQuestResolutionInput, getQuestSuccessBreakdown, normalizeQuestFeatures} from "./taskResolution";
import type {
  AdventurerCapabilityAxis,
  AdventurerPersonalityAxis,
  GameData,
  IntelDefinition,
  IntelRecord,
  QuestFeatures,
  Quest,
  QuestResult,
  QuestResultOutcome,
  QuestResultReasonTag,
  SavedQuestResult,
  QuestTemplate,
  StoryEntry
} from "../../core/types";

export function resolveQuestResult(gameData: GameData, quest: Quest): QuestResult {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const resultMode = template?.resultMode ?? "resource";
  const outcomeDetails = getQuestOutcomeDetails(gameData, quest, template);
  const outcome = outcomeDetails.outcome;
  const matchingIntelCount = template?.lineId ? getUniqueIntelCountForLine(gameData, template.lineId) : 0;

  if (outcome === "failure") {
    const failureIntel = getIntelDefinitionById(gameData, template?.failureIntelId);
    const failureKind = failureIntel?.kind ?? (resultMode === "discovery" ? "discovery" : "lead");
    const reasonTags = getQuestResultReasonTags(template, outcomeDetails.successBreakdown, "failure");
    return restoreQuestResult(gameData, quest, {
      type: failureKind,
      outcome,
      details: {
        resourceId: null,
        quantity: null,
        intelKind: failureKind,
        intelId: failureIntel?.id ?? null,
        matchingIntelCount: matchingIntelCount || null,
        successChance: outcomeDetails.successChance,
        rolledChance: outcomeDetails.rolledChance,
        reasonTags
      }
    });
  }

  if (resultMode === "lead") {
    const leadIntel = getRandomIntelDefinitionFromPool(gameData, template?.resultIntelPoolIds)
      ?? getIntelDefinitionById(gameData, template?.resultIntelId);
    const reasonTags = getQuestResultReasonTags(template, outcomeDetails.successBreakdown, "lead");
    return restoreQuestResult(gameData, quest, {
      type: "lead",
      outcome,
      details: {
        resourceId: null,
        quantity: null,
        intelKind: "lead",
        intelId: leadIntel?.id ?? null,
        matchingIntelCount,
        successChance: outcomeDetails.successChance,
        rolledChance: outcomeDetails.rolledChance,
        reasonTags
      }
    });
  }

  if (resultMode === "discovery") {
    const discoveryIntel = getIntelDefinitionById(gameData, template?.resultIntelId);
    const reasonTags = getQuestResultReasonTags(template, outcomeDetails.successBreakdown, "discovery");
    return restoreQuestResult(gameData, quest, {
      type: "discovery",
      outcome,
      details: {
        resourceId: null,
        quantity: null,
        intelKind: "discovery",
        intelId: discoveryIntel?.id ?? null,
        matchingIntelCount,
        successChance: outcomeDetails.successChance,
        rolledChance: outcomeDetails.rolledChance,
        reasonTags
      }
    });
  }

  const reasonTags = getQuestResultReasonTags(template, outcomeDetails.successBreakdown, "resource");
  return restoreQuestResult(gameData, quest, {
    type: "resource",
    outcome,
    details: {
      resourceId: quest.resource,
      quantity: quest.quantity,
      intelKind: null,
      intelId: null,
      matchingIntelCount: null,
      successChance: outcomeDetails.successChance,
      rolledChance: outcomeDetails.rolledChance,
      reasonTags
    }
  });
}

export function toSavedQuestResult(result: QuestResult): SavedQuestResult {
  return {
    type: result.type,
    outcome: result.outcome,
    details: {
      resourceId: result.details.resourceId,
      quantity: result.details.quantity,
      intelKind: result.details.intelKind,
      intelId: result.details.intelId,
      matchingIntelCount: result.details.matchingIntelCount,
      successChance: result.details.successChance,
      rolledChance: result.details.rolledChance,
      reasonTags: [...result.details.reasonTags]
    }
  };
}

export function restoreQuestResult(gameData: GameData, quest: Quest, savedResult: SavedQuestResult): QuestResult {
  const display = buildQuestResultDisplay(gameData, quest, savedResult);
  const details = {
    ...savedResult.details,
    reasonTags: [...savedResult.details.reasonTags],
    visibleReasonTags: getVisibleQuestResultReasonTags(savedResult.details.reasonTags),
    display
  };

  return {
    type: savedResult.type,
    outcome: savedResult.outcome,
    summary: buildQuestResultSummary(gameData, quest, savedResult, display),
    details
  };
}

export function getQuestResultSummary(gameData: GameData, quest: Quest, result: QuestResult): string {
  if (result.type === "resource") {
    return `获得 ${result.details.quantity ?? quest.quantity} 个 ${getQuestResourceLabel(gameData, quest)}`;
  }

  const intelSummary = getQuestResultIntelSummary(quest, result);
  if (result.type === "lead") {
    return `获得线索：${intelSummary}`;
  }

  if (result.type === "discovery") {
    return `获得发现：${intelSummary}`;
  }

  return intelSummary;
}

export function applyQuestResult(
  gameData: GameData,
  quest: Quest,
  result: QuestResult,
  nextDayEntries: StoryEntry[]
): void {
  if (result.outcome === "failure") {
    const failureRecord = createQuestResultIntelRecord(gameData, quest, result, true);
    if (failureRecord.kind === "lead") {
      gameData.player.leads.unshift(failureRecord);
    } else {
      gameData.player.discoveries.unshift(failureRecord);
    }
    nextDayEntries.push(
      createStoryEntry("task_failed", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        failureText: failureRecord.summary
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [failureRecord]);
    return;
  }

  if (result.type === "resource") {
    if (!quest.resource) {
      return;
    }

    gameData.player.stock[quest.resource] = (gameData.player.stock[quest.resource] ?? 0) + quest.quantity;
    nextDayEntries.push(
      createStoryEntry("task_completed", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        quantity: quest.quantity,
        resourceLabel: getQuestResourceLabel(gameData, quest)
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, []);
    return;
  }

  if (result.type === "lead") {
    const leadRecord = createQuestResultIntelRecord(gameData, quest, result);
    gameData.player.leads.unshift(leadRecord);
    nextDayEntries.push(
      createStoryEntry("task_lead_found", {
        day: gameData.day,
        questDisplayId: quest.displayId,
        questTitle: quest.title,
        leadText: leadRecord.summary
      })
    );
    pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [leadRecord]);
    return;
  }

  const discoveryRecord = createQuestResultIntelRecord(gameData, quest, result);
  gameData.player.discoveries.unshift(discoveryRecord);
  nextDayEntries.push(
    createStoryEntry("task_discovery_made", {
      day: gameData.day,
      questDisplayId: quest.displayId,
      questTitle: quest.title,
      discoveryText: discoveryRecord.summary
    })
  );
  pushUnlockedFollowUpEntries(gameData, quest, nextDayEntries, [discoveryRecord]);
}

function getQuestOutcomeDetails(gameData: GameData, quest: Quest, template: QuestTemplate | undefined) {
  switch (template?.testOutcomeMode) {
    case "failure":
      return {outcome: "failure" as QuestResultOutcome, successChance: null, rolledChance: null, successBreakdown: null};
    case "success":
      return {outcome: "success" as QuestResultOutcome, successChance: null, rolledChance: null, successBreakdown: null};
    case "normal":
    default:
      break;
  }

  if (!template || getQuestPublishMode(template) !== "intel") {
    return {outcome: "success" as QuestResultOutcome, successChance: null, rolledChance: null, successBreakdown: null};
  }

  const matchingIntelCount = template.lineId ? getUniqueIntelCountForLine(gameData, template.lineId) : 0;
  const adventurer = getQuestAdventurer(gameData, quest);
  const successBreakdown = getQuestSuccessBreakdown(
    getQuestResolutionInput(quest, template),
    adventurer,
    matchingIntelCount
  );
  const rolledChance = Math.random();

  return {
    outcome: rolledChance < successBreakdown.finalChance ? "success" as QuestResultOutcome : "failure" as QuestResultOutcome,
    successChance: successBreakdown.finalChance,
    rolledChance,
    successBreakdown
  };
}

function getQuestResultReasonTags(
  template: QuestTemplate | undefined,
  successBreakdown: ReturnType<typeof getQuestSuccessBreakdown> | null,
  fallbackTag: QuestResultReasonTag
): QuestResultReasonTag[] {
  const tags = new Set<QuestResultReasonTag>([fallbackTag]);

  if (!template || !successBreakdown) {
    return [...tags];
  }

  if (successBreakdown.intelBonus > 0) {
    tags.add("intel");
  }
  if (Math.abs(successBreakdown.capabilityBonus) >= 0.03) {
    tags.add("capability");
  }
  if (Math.abs(successBreakdown.personalityBonus) >= 0.03) {
    tags.add("personality");
  }

  const features = successBreakdown.inputFeatures;
  if (features.danger >= 0.55) tags.add("danger");
  if (features.challenge >= 0.55) tags.add("challenge");
  if (features.durationPressure >= 0.55) tags.add("durationPressure");
  if (features.uncertainty >= 0.55) tags.add("uncertainty");
  if (features.investigationComplexity >= 0.55) tags.add("investigationComplexity");
  if (features.reportDifficulty >= 0.55) tags.add("reportDifficulty");
  if (features.stability >= 0.65 || features.stability <= 0.35) tags.add("stability");

  return [...tags].sort((left, right) => getQuestResultReasonPriority(left) - getQuestResultReasonPriority(right));
}

export function getQuestResultVisibleReasonTexts(gameData: GameData, quest: Quest): string[] {
  const result = quest.result;
  if (!result) {
    return [];
  }

  return result.details.visibleReasonTags.map((tag) => {
    const context = getQuestResultReasonTextContext(gameData, quest, tag);
    return renderQuestResultReasonText(context);
  });
}

function getVisibleQuestResultReasonTags(reasonTags: QuestResultReasonTag[]) {
  return reasonTags.filter((tag) => isVisibleQuestResultReasonTag(tag)).slice(0, 4);
}

function getQuestResultReasonTextContext(gameData: GameData, quest: Quest, tag: QuestResultReasonTag) {
  switch (tag) {
    case "capability":
      return {
        tag,
        variant: getCapabilityReasonVariant(gameData, quest)
      } as const;
    case "personality":
      return {
        tag,
        variant: getPersonalityReasonVariant(gameData, quest)
      } as const;
    default:
      return {
        tag,
        variant: null
      } as const;
  }
}

function renderQuestResultReasonText(
  context:
    | {tag: "capability"; variant: AdventurerCapabilityAxis | "generic"}
    | {tag: "personality"; variant: AdventurerPersonalityAxis | "generic"}
    | {tag: Exclude<QuestResultReasonTag, "capability" | "personality">; variant: null}
) {
  switch (context.tag) {
    case "danger":
      return "这次更像是被明显的危险压住了手脚。";
    case "challenge":
      return "委托本身的门槛比表面看上去更高。";
    case "durationPressure":
      return "路上的消耗和拖延比预想更磨人。";
    case "uncertainty":
      return "路上的变数太多，很多判断难以及时落定。";
    case "investigationComplexity":
      return "这类线索需要更熟悉门道的人来拆解。";
    case "reportDifficulty":
      return "就算带回了东西，也不容易整理成稳定回报。";
    case "stability":
      return "事情的发展没有按常规路数推进。";
    case "intel":
      return "先前掌握的信息这次确实帮上了忙。";
    case "capability":
      return renderCapabilityReasonText(context.variant);
    case "personality":
      return renderPersonalityReasonText(context.variant);
    case "resource":
    case "lead":
    case "discovery":
    case "failure":
    default:
      return "这次的结果背后还有一些没完全看清的因素。";
  }
}

function isVisibleQuestResultReasonTag(tag: QuestResultReasonTag) {
  switch (tag) {
    case "danger":
    case "challenge":
    case "durationPressure":
    case "uncertainty":
    case "investigationComplexity":
    case "reportDifficulty":
    case "stability":
    case "intel":
    case "capability":
    case "personality":
      return true;
    case "resource":
    case "lead":
    case "discovery":
    case "failure":
    default:
      return false;
  }
}

function getQuestResultReasonPriority(tag: QuestResultReasonTag) {
  switch (tag) {
    case "danger":
      return 10;
    case "challenge":
      return 20;
    case "durationPressure":
      return 30;
    case "uncertainty":
      return 40;
    case "investigationComplexity":
      return 50;
    case "reportDifficulty":
      return 60;
    case "stability":
      return 70;
    case "intel":
      return 80;
    case "capability":
      return 90;
    case "personality":
      return 100;
    case "failure":
      return 110;
    case "resource":
      return 120;
    case "lead":
      return 130;
    case "discovery":
      return 140;
    default:
      return 999;
  }
}

function getCapabilityReasonVariant(gameData: GameData, quest: Quest): AdventurerCapabilityAxis | "generic" {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const adventurer = getQuestAdventurer(gameData, quest);
  if (!template || !adventurer) {
    return "generic";
  }

  const input = getQuestResolutionInput(quest, template);
  const normalizedInput = {...input, features: normalizeQuestFeatures(input.features)};
  return getDominantCapabilityAxis(normalizedInput, adventurer.capabilities);
}

function renderCapabilityReasonText(variant: AdventurerCapabilityAxis | "generic"): string {
  switch (variant) {
    case "combat":
      return "这次更吃正面对抗和临场压制，换人手感可能会完全不同。";
    case "observation":
      return "这类活更看眼力和辨别痕迹，不是谁都能看出门道。";
    case "exploration":
      return "这类委托更吃找路、拆线索和现场判断。";
    case "survival":
      return "这趟活更考验一路上的应变和扛压，不只是肯不肯去。";
    case "physique":
      return "这次更像是被一路上的体力消耗和硬扛能力拉开了差距。";
    default:
      return "这次的人选和委托性质是否贴合，影响很大。";
  }
}

function getPersonalityReasonVariant(gameData: GameData, quest: Quest): AdventurerPersonalityAxis | "generic" {
  const template = getQuestTemplateById(gameData, quest.templateId);
  const adventurer = getQuestAdventurer(gameData, quest);
  if (!template || !adventurer) {
    return "generic";
  }

  const input = getQuestResolutionInput(quest, template);
  return getDominantPersonalityAxis(normalizeQuestFeatures(input.features), adventurer.personality);
}

function renderPersonalityReasonText(variant: AdventurerPersonalityAxis | "generic"): string {
  switch (variant) {
    case "caution":
      return "这次更像是顾虑太多，很多窗口没有真正抓住。";
    case "courage":
      return "敢不敢顶上去，直接改变了这次处理委托的方式。";
    case "curiosity":
      return "愿不愿意继续追索那些可疑细节，明显影响了结果。";
    case "resilience":
      return "一路上能不能扛住消耗，比最初看上去更关键。";
    case "discipline":
      return "这次更吃执行时能不能按住节奏、稳稳收束。";
    default:
      return "执行时的判断和作风，明显左右了结果。";
  }
}

function getDominantCapabilityAxis(
  input: ReturnType<typeof getQuestResolutionInput>,
  capabilities: {
    physique: number;
    survival: number;
    exploration: number;
    observation: number;
    combat: number;
  }
): AdventurerCapabilityAxis {
  const weights = getQuestCapabilityWeights(input);
  const ranked = Object.entries(weights)
    .map(([axis, weight]) => ({
      axis: axis as AdventurerCapabilityAxis,
      value: weight * capabilities[axis as AdventurerCapabilityAxis]
    }))
    .sort((left, right) => right.value - left.value);
  return ranked[0]?.axis ?? "exploration";
}

function getDominantPersonalityAxis(
  features: QuestFeatures,
  personality: {
    diligence: number;
    courage: number;
    greed: number;
    sociability: number;
    caution: number;
    curiosity: number;
    discipline: number;
    resilience: number;
  }
): AdventurerPersonalityAxis {
  const contributions = [
    {axis: "curiosity" as const, value: personality.curiosity * (features.investigationComplexity + features.uncertainty * 0.6)},
    {axis: "caution" as const, value: personality.caution * (features.danger + features.uncertainty)},
    {axis: "courage" as const, value: personality.courage * features.danger},
    {axis: "resilience" as const, value: personality.resilience * features.durationPressure},
    {axis: "discipline" as const, value: personality.discipline * features.stability}
  ].sort((left, right) => right.value - left.value);

  return contributions[0]?.axis ?? "curiosity";
}

function getQuestTemplateById(gameData: GameData, templateId: string): QuestTemplate | undefined {
  return gameData.questTemplates.find((template) => template.id === templateId);
}

function getIntelDefinitionById(gameData: GameData, intelId: string | undefined): IntelDefinition | undefined {
  if (!intelId) {
    return undefined;
  }

  return gameData.intelDefinitions.find((intel) => intel.id === intelId);
}

function getRandomIntelDefinitionFromPool(gameData: GameData, intelIds: string[] | undefined) {
  if (!intelIds || intelIds.length === 0) {
    return undefined;
  }

  const availableIntel = intelIds
    .map((intelId) => getIntelDefinitionById(gameData, intelId))
    .filter((intel): intel is NonNullable<typeof intel> => Boolean(intel));

  if (availableIntel.length === 0) {
    return undefined;
  }

  return availableIntel[Math.floor(Math.random() * availableIntel.length)];
}

function getQuestPublishMode(template: QuestTemplate | undefined): "stock" | "intel" {
  if (!template) {
    return "stock";
  }

  return template.publishMode ?? (template.nature === "investigation" || template.nature === "mysterious" ? "intel" : "stock");
}

function getQuestAdventurer(gameData: GameData, quest: Quest) {
  if (!quest.adventurerId) {
    return undefined;
  }

  return gameData.adventurers.find((adventurer) => adventurer.id === quest.adventurerId);
}

function getUniqueIntelCountForLine(gameData: GameData, lineId: string): number {
  const intelIds = new Set(
    [...gameData.player.leads, ...gameData.player.discoveries]
      .filter((record) => record.lineId === lineId)
      .map((record) => record.id)
  );

  return intelIds.size;
}

function createIntelRecord(
  gameData: GameData,
  quest: Quest,
  kind: IntelRecord["kind"],
  intelId: string | undefined,
  title: string,
  summary: string
): IntelRecord {
  const intelDefinition = getIntelDefinitionById(gameData, intelId);
  const generatedIntelText = getGeneratedIntelText(intelDefinition, `${quest.id}:${kind}:${intelId ?? "fallback"}:${quest.result?.outcome ?? "success"}`);
  const questTemplate = getQuestTemplateById(gameData, quest.templateId);
  return {
    id: intelId ?? `${quest.templateId}-${kind}-${gameData.day}`,
    kind,
    title: generatedIntelText.title ?? title,
    day: gameData.day,
    summary: generatedIntelText.content ?? summary,
    lineId: intelDefinition?.lineId ?? questTemplate?.lineId ?? null,
    lineTitle: generatedIntelText.lineTitle ?? intelDefinition?.lineTitle ?? questTemplate?.lineTitle ?? null,
    sourceQuestDisplayId: quest.displayId,
    sourceQuestTitle: quest.title,
    sourceTemplateId: quest.templateId,
    sourceOutcome: quest.result?.outcome ?? "success"
  };
}

function createQuestResultIntelRecord(
  gameData: GameData,
  quest: Quest,
  result: QuestResult,
  isFailure = false
) {
  const fallbackKind = result.type === "discovery" ? "discovery" : "lead";
  const kind = result.details.intelKind ?? fallbackKind;
  const title = getQuestResultIntelTitle(quest, result, isFailure);
  const summary = getQuestResultIntelSummary(quest, result);

  return createIntelRecord(
    gameData,
    quest,
    kind,
    result.details.intelId ?? undefined,
    title,
    summary
  );
}

export function getQuestResultIntelTitle(quest: Quest, result: QuestResult, isFailure = false): string {
  const fallbackKind = result.type === "discovery" ? "discovery" : "lead";
  const kind = result.details.intelKind ?? fallbackKind;
  return result.details.display.intelTitleOverride ?? getFallbackIntelTitle(quest, kind, isFailure);
}

export function getQuestResultIntelSummary(quest: Quest, result: QuestResult): string {
  if (result.details.display.intelSummaryOverride) {
    return result.details.display.intelSummaryOverride;
  }

  return result.type === "discovery" ? buildDiscoveryText(quest) : buildLeadText(quest);
}

function buildQuestResultSummary(
  gameData: GameData,
  quest: Quest,
  savedResult: SavedQuestResult,
  display: QuestResult["details"]["display"]
): string {
  if (savedResult.type === "resource") {
    return `获得 ${savedResult.details.quantity ?? quest.quantity} 个 ${getQuestResourceLabel(gameData, quest)}`;
  }

  const intelSummary = display.intelSummaryOverride ?? (
    savedResult.type === "discovery" ? buildDiscoveryText(quest) : buildLeadText(quest)
  );
  if (savedResult.type === "lead") {
    return `获得线索：${intelSummary}`;
  }

  if (savedResult.type === "discovery") {
    return `获得发现：${intelSummary}`;
  }

  return intelSummary;
}

function buildQuestResultDisplay(
  gameData: GameData,
  quest: Quest,
  savedResult: SavedQuestResult
): QuestResult["details"]["display"] {
  if (savedResult.type === "resource") {
    return {
      intelTitleOverride: null,
      intelSummaryOverride: null
    };
  }

  const template = getQuestTemplateById(gameData, quest.templateId);
  const fallbackKind = savedResult.type === "discovery" ? "discovery" : "lead";
  const kind = savedResult.details.intelKind ?? fallbackKind;
  const intelDefinition = getIntelDefinitionById(gameData, savedResult.details.intelId ?? undefined);
  const generatedIntelText = getGeneratedIntelText(
    intelDefinition,
    `${quest.id}:${kind}:${savedResult.details.intelId ?? "fallback"}:${savedResult.outcome}`
  );

  if (savedResult.outcome === "failure") {
    return {
      intelTitleOverride: generatedIntelText.title ?? intelDefinition?.title ?? getFallbackIntelTitle(quest, kind, true),
      intelSummaryOverride: generatedIntelText.content ?? intelDefinition?.content ?? template?.failureIntelSummary ?? `${quest.title} 这次没有带回稳定成果`
    };
  }

  return {
    intelTitleOverride: generatedIntelText.title ?? intelDefinition?.title ?? getFallbackIntelTitle(quest, kind),
    intelSummaryOverride: generatedIntelText.content ?? intelDefinition?.content ?? (savedResult.type === "discovery" ? buildDiscoveryText(quest) : buildLeadText(quest))
  };
}

function getFallbackIntelTitle(quest: Quest, kind: IntelRecord["kind"], isFailure = false): string {
  if (isFailure) {
    return `${quest.title}后续回报`;
  }

  return kind === "discovery" ? `${quest.title}发现记录` : `${quest.title}线索记录`;
}

function buildLeadText(quest: Quest): string {
  return `${quest.title} 留下了新的调查方向`;
}

function buildDiscoveryText(quest: Quest): string {
  return `${quest.title} 带回了一条异常发现记录`;
}

function getGeneratedIntelText(
  intelDefinition: IntelDefinition | undefined,
  seedKey: string
): {title: string | null; content: string | null; lineTitle: string | null} {
  if (!intelDefinition) {
    return {
      title: null,
      content: null,
      lineTitle: null
    };
  }

  const textPool = intelTextPoolsById[intelDefinition.textId ?? intelDefinition.id] ?? {};
  return {
    title: pickFlexibleTextValue(textPool.title, `${seedKey}:title`, intelDefinition.title),
    content: pickFlexibleTextValue(textPool.content, `${seedKey}:content`, intelDefinition.content),
    lineTitle: pickFlexibleTextValue(textPool.lineTitle, `${seedKey}:lineTitle`, intelDefinition.lineTitle ?? "")
  };
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
  let hash = 0;
  for (let index = 0; index < seedKey.length; index += 1) {
    hash = ((hash << 5) - hash + seedKey.charCodeAt(index)) | 0;
  }

  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}

function pushUnlockedFollowUpEntries(
  gameData: GameData,
  quest: Quest,
  nextDayEntries: StoryEntry[],
  intelRecords: IntelRecord[]
): void {
  getUnlockedTemplatesFromQuestResolution(gameData, quest, intelRecords).forEach((template) => {
    if (hasQuestTemplateBeenIntroduced(gameData, template.id)) {
      return;
    }

    nextDayEntries.push(
      createStoryEntry("follow_up_unlocked", {
        day: gameData.day,
        sourceQuestDisplayId: quest.displayId,
        sourceQuestTitle: quest.title,
        unlockedTitle: template.title
      })
    );
  });
}

function hasQuestTemplateBeenIntroduced(gameData: GameData, templateId: string): boolean {
  return gameData.player.quests.some((quest) => quest.templateId === templateId);
}
