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
  const modal = elements.adventurerDetailModal
    ?? document.querySelector<HTMLDivElement>("#adventurer-detail-modal");
  const content = elements.adventurerDetailContent
    ?? document.querySelector<HTMLElement>("#adventurer-detail-content");
  if (!adventurer || !modal || !content) {
    return;
  }

  elements.adventurerDetailModal = modal;
  elements.adventurerDetailContent = content;
  elements.adventurerDetailCloseBtn = elements.adventurerDetailCloseBtn
    ?? document.querySelector<HTMLButtonElement>("#adventurer-detail-close-btn");

  const viewModel = getAdventurerCardViewModel(gameData, adventurer);
  content.innerHTML = `
    <article class="adventurer-card">
      ${buildAdventurerMarkup(viewModel)}
    </article>
  `;
  modal.dataset.adventurerId = adventurerId;
  modal.hidden = false;
  modal.classList.add("is-open");
  elements.adventurerDetailCloseBtn?.focus();
}

export function closeAdventurerDetail(elements: Elements): void {
  const modal = elements.adventurerDetailModal
    ?? document.querySelector<HTMLDivElement>("#adventurer-detail-modal");
  if (!modal || modal.hidden) {
    return;
  }

  modal.hidden = true;
  modal.classList.remove("is-open");
  delete modal.dataset.adventurerId;
}

export function renderAdventurerDetailIfOpen(gameData: GameData, elements: Elements): void {
  const adventurerId = elements.adventurerDetailModal?.dataset.adventurerId;
  if (!adventurerId || elements.adventurerDetailModal?.hidden) {
    return;
  }

  openAdventurerDetail(gameData, elements, adventurerId);
}
