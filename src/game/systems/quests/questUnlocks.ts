import type {GameData, IntelRecord, Quest, QuestResultOutcome, QuestTemplate, QuestUnlockCondition} from "../../core/types";

export function getQuestUnlockConditions(template: QuestTemplate): QuestUnlockCondition[] {
  if (template.disabledForCurrentTesting) {
    return [];
  }

  if (template.unlockConditions && template.unlockConditions.length > 0) {
    return template.unlockConditions;
  }

  if (template.unlockedByDefault) {
    return [{type: "default"}];
  }

  if (template.prerequisiteTemplateId) {
    return [{
      type: "questResult",
      templateId: template.prerequisiteTemplateId,
      outcome: template.prerequisiteOutcome
    }];
  }

  return [];
}

export function isQuestTemplateUnlocked(gameData: GameData, template: QuestTemplate): boolean {
  const conditions = getQuestUnlockConditions(template);
  if (conditions.length === 0) {
    return false;
  }

  const unlockMode = template.unlockMode ?? "all";
  const evaluator = unlockMode === "any" ? "some" : "every";
  return conditions[evaluator]((condition) => isUnlockConditionSatisfied(gameData, condition));
}

export function getFollowUpTemplatesForIntel(gameData: GameData, record: IntelRecord): QuestTemplate[] {
  return gameData.questTemplates.filter((template) => {
    const conditions = getQuestUnlockConditions(template);
    return conditions.some((condition) => isUnlockConditionSatisfiedByIntelRecord(record, condition));
  });
}

export function getUnlockedTemplatesFromQuestResult(
  gameData: GameData,
  templateId: string,
  outcome: QuestResultOutcome
): QuestTemplate[] {
  return gameData.questTemplates.filter((template) => {
    const conditions = getQuestUnlockConditions(template);
    return conditions.some((condition) => {
      return condition.type === "questResult"
        && condition.templateId === templateId
        && (condition.outcome === undefined || condition.outcome === outcome);
    });
  });
}

export function getUnlockedTemplatesFromQuestResolution(
  gameData: GameData,
  quest: Quest,
  intelRecords: IntelRecord[]
): QuestTemplate[] {
  return gameData.questTemplates.filter((template) => {
    const conditions = getQuestUnlockConditions(template);
    return conditions.some((condition) => {
      if (condition.type === "questResult") {
        return condition.templateId === quest.templateId
          && (condition.outcome === undefined || condition.outcome === quest.result?.outcome);
      }

      if (condition.type === "intelReceived") {
        return intelRecords.some((record) => isUnlockConditionSatisfiedByIntelRecord(record, condition));
      }

      return false;
    });
  });
}

function isUnlockConditionSatisfied(gameData: GameData, condition: QuestUnlockCondition): boolean {
  switch (condition.type) {
    case "default":
      return true;
    case "questResult":
      return gameData.player.quests.some((quest) => {
        return quest.templateId === condition.templateId
          && quest.completedDay !== null
          && (condition.outcome === undefined || quest.result?.outcome === condition.outcome);
      });
    case "intelReceived":
      return getAllIntelRecords(gameData).some((record) => {
        return (condition.kind === undefined || record.kind === condition.kind)
          && (condition.sourceTemplateId === undefined || record.sourceTemplateId === condition.sourceTemplateId)
          && ((condition as {intelId?: string}).intelId === undefined || record.id === (condition as {intelId?: string}).intelId);
      });
    default:
      return false;
  }
}

function isUnlockConditionSatisfiedByIntelRecord(record: IntelRecord, condition: QuestUnlockCondition): boolean {
  switch (condition.type) {
    case "questResult":
      return record.sourceTemplateId === condition.templateId
        && (condition.outcome === undefined || record.sourceOutcome === condition.outcome);
    case "intelReceived":
      return (condition.kind === undefined || record.kind === condition.kind)
        && (condition.sourceTemplateId === undefined || record.sourceTemplateId === condition.sourceTemplateId)
        && ((condition as {intelId?: string}).intelId === undefined || record.id === (condition as {intelId?: string}).intelId);
    default:
      return false;
  }
}

function getAllIntelRecords(gameData: GameData): IntelRecord[] {
  return [...gameData.player.leads, ...gameData.player.discoveries];
}
