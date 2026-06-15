import type {GameData, Quest} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getQuestCardViewModel, type QuestCardViewModel} from "../viewModels";

export function renderQuestCollection(
  gameData: GameData,
  target: HTMLDivElement | null,
  quests: Quest[],
  emptyText: string
): void {
  if (!target) {
    return;
  }

  target.innerHTML = "";

  if (quests.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  quests.forEach((quest) => {
    const questElement = document.createElement("article");
    questElement.className = `quest-card ${quest.status}`;
    questElement.innerHTML = buildQuestCardMarkup(getQuestCardViewModel(gameData, quest));
    target.appendChild(questElement);
  });
}

function buildQuestCardMarkup(quest: QuestCardViewModel): string {
  return `
    <div class="quest-head">
      <strong>${uiLabels.questCard.prefix} ${quest.displayId}</strong>
      <span class="status-pill ${quest.statusClass}">${quest.statusText}</span>
    </div>
    <p class="quest-body"><strong>${quest.titleText}</strong> <span class="log-badge quest">${quest.badgeText}</span></p>
    <p class="quest-body">${quest.descriptionText}</p>
    <div class="quest-meta">
      <span>${quest.bodyText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.riskText}</span>
      <span>${quest.natureText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.rewardText}</span>
      <span>${quest.durationText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.createdDayText}</span>
      <span>${quest.progressText}</span>
    </div>
    ${quest.adventurerText ? `<div class="adventurer-meta">${quest.adventurerText}</div>` : ""}
    ${quest.resultText ? `<div class="adventurer-meta">${quest.resultText}</div>` : ""}
    ${quest.resultReasonText ? `<div class="adventurer-meta">${quest.resultReasonText}</div>` : ""}
  `;
}
