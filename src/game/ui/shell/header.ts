import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getHeaderSummaryViewModel} from "../viewModels";

export function getHeaderMarkup(): string {
  return `
    <section class="status-panel panel">
      <div class="toolbar-stats">
        <article class="summary-card"><span>${uiLabels.summary.day}</span><strong id="day-display"></strong></article>
        <article class="summary-card"><span>${uiLabels.summary.money}</span><strong id="money-display"></strong></article>
        <article class="summary-card"><span>${uiLabels.summary.activeQuests}</span><strong id="active-quest-display"></strong></article>
        <article class="summary-card"><span>${uiLabels.summary.stockTotal}</span><strong id="stock-summary-display"></strong></article>
        <article class="summary-card"><span>${uiLabels.summary.knownAdventurers}</span><strong id="known-adventurer-display"></strong></article>
      </div>
      <button id="next-day-btn" class="primary-button next-day-button" type="button">${uiLabels.form.nextDay}</button>
    </section>
  `;
}

export function renderHeader(gameData: GameData, elements: Elements): void {
  const summary = getHeaderSummaryViewModel(gameData);

  if (elements.dayDisplay) elements.dayDisplay.textContent = summary.dayText;
  if (elements.moneyDisplay) elements.moneyDisplay.textContent = summary.moneyText;
  if (elements.activeQuestDisplay) elements.activeQuestDisplay.textContent = summary.activeQuestText;
  if (elements.stockSummaryDisplay) elements.stockSummaryDisplay.textContent = summary.stockTotalText;
  if (elements.knownAdventurerDisplay) elements.knownAdventurerDisplay.textContent = summary.knownAdventurerText;
}
