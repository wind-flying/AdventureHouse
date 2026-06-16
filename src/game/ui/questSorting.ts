import type {Quest} from "../core/types";

export function sortQuestsForDisplay(quests: readonly Quest[], currentDay: number): Quest[] {
  return [...quests].sort((left, right) => {
    const priorityDifference = getQuestDisplayPriority(left, currentDay)
      - getQuestDisplayPriority(right, currentDay);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const recencyDifference = getQuestRecencyDay(right) - getQuestRecencyDay(left);
    return recencyDifference !== 0 ? recencyDifference : right.id - left.id;
  });
}

function getQuestDisplayPriority(quest: Quest, currentDay: number): number {
  if (quest.status === "pending" && quest.createdDay === currentDay) {
    return 0;
  }

  if (quest.status === "active") {
    return isProgressionQuest(quest) ? 1 : 2;
  }

  return quest.status === "pending" ? 3 : 4;
}

function isProgressionQuest(quest: Quest): boolean {
  return quest.category === "main"
    || quest.nature === "investigation"
    || quest.nature === "mysterious";
}

function getQuestRecencyDay(quest: Quest): number {
  if (quest.status === "completed") {
    return quest.completedDay ?? quest.acceptedDay ?? quest.createdDay;
  }

  if (quest.status === "active") {
    return quest.acceptedDay ?? quest.createdDay;
  }

  return quest.createdDay;
}
