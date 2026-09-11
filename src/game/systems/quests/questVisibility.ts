import type {GameData, QuestTemplate} from "../../core/types";
import {isQuestTemplateUnlocked} from "./questUnlocks";

export function getVisibleQuestTemplates(gameData: GameData): QuestTemplate[] {
  return gameData.questTemplates.filter((template) => {
    const hasHiddenOutcome = gameData.player.quests.some((quest) => {
      if (quest.templateId !== template.id || quest.completedDay === null || !quest.result) {
        return false;
      }
      return getQuestTemplateOutcomeVisibility(template, quest.result.outcome) === "hide";
    });
    return !hasHiddenOutcome && isQuestTemplateUnlocked(gameData, template);
  });
}

function getQuestTemplateOutcomeVisibility(
  template: QuestTemplate,
  outcome: "success" | "failure"
) {
  return outcome === "success"
    ? template.successVisibility ?? "stay"
    : template.failureVisibility ?? "stay";
}
