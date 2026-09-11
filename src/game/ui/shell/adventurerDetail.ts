import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getAdventurerCardViewModel} from "../viewModels";
import {buildAdventurerMarkup} from "../tabs/adventurersTab";
import {findKnownAdventurer} from "../workbench/act1Goals";

export function getAdventurerDetailMarkup(): string {
  return `
    <div id="adventurer-detail-modal" class="adventurer-detail-overlay" role="dialog" aria-modal="true"
      aria-labelledby="adventurer-detail-title" hidden>
      <section class="adventurer-detail-dialog">
        <header class="adventurer-detail-header">
          <h2 id="adventurer-detail-title">${uiLabels.workbench.inTownTitle}</h2>
          <button id="adventurer-detail-close-btn" class="secondary-button" type="button">${uiLabels.workbench.closeDetail}</button>
        </header>
        <div id="adventurer-detail-content" class="adventurer-detail-content"></div>
      </section>
    </div>
  `;
}

export function openAdventurerDetail(gameData: GameData, elements: Elements, adventurerId: string): void {
  const adventurer = findKnownAdventurer(gameData, adventurerId);
  if (!adventurer || !elements.adventurerDetailModal || !elements.adventurerDetailContent) {
    return;
  }

  const viewModel = getAdventurerCardViewModel(gameData, adventurer);
  elements.adventurerDetailContent.innerHTML = `
    <article class="adventurer-card">
      ${buildAdventurerMarkup(viewModel)}
    </article>
  `;
  elements.adventurerDetailModal.dataset.adventurerId = adventurerId;
  elements.adventurerDetailModal.hidden = false;
  elements.adventurerDetailCloseBtn?.focus();
}

export function closeAdventurerDetail(elements: Elements): void {
  if (!elements.adventurerDetailModal || elements.adventurerDetailModal.hidden) {
    return;
  }

  elements.adventurerDetailModal.hidden = true;
  delete elements.adventurerDetailModal.dataset.adventurerId;
}

export function renderAdventurerDetailIfOpen(gameData: GameData, elements: Elements): void {
  const adventurerId = elements.adventurerDetailModal?.dataset.adventurerId;
  if (!adventurerId || elements.adventurerDetailModal?.hidden) {
    return;
  }

  openAdventurerDetail(gameData, elements, adventurerId);
}
