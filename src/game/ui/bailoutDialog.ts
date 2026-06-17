import {
  acceptBailoutOffer,
  declineBailoutOffer,
  getBailoutDialogCopy,
  getPendingBailoutOffer
} from "../systems/economy/bailout";
import {uiLabels} from "../text/uiLabels";
import type {ActionResult, Elements, GameData} from "../core/types";

export function getBailoutDialogMarkup(): string {
  return `
    <div id="bailout-modal" class="gift-overlay bailout-overlay" hidden>
      <section class="gift-dialog bailout-dialog" role="dialog" aria-modal="true" aria-labelledby="bailout-dialog-title">
        <header class="gift-header">
          <h2 id="bailout-dialog-title">${uiLabels.bailout.titlePlaceholder}</h2>
        </header>
        <div id="bailout-content" class="gift-content bailout-content"></div>
        <footer class="gift-footer bailout-footer">
          <button id="bailout-decline-btn" class="secondary-button" type="button">${uiLabels.bailout.decline}</button>
          <button id="bailout-accept-btn" class="primary-button" type="button">${uiLabels.bailout.accept}</button>
        </footer>
      </section>
    </div>
  `;
}

export function ensureBailoutElements(container: HTMLElement, elements: Elements): void {
  elements.bailoutModal = container.querySelector("#bailout-modal");
  elements.bailoutTitle = container.querySelector("#bailout-dialog-title");
  elements.bailoutContent = container.querySelector("#bailout-content");
  elements.bailoutAcceptBtn = container.querySelector("#bailout-accept-btn");
  elements.bailoutDeclineBtn = container.querySelector("#bailout-decline-btn");
}

export function openBailoutDialogIfPending(
  gameData: GameData,
  elements: Elements,
  container?: HTMLElement | null
): boolean {
  if (container) {
    ensureBailoutElements(container, elements);
  }

  if (getPendingBailoutOffer(gameData) === null) {
    closeBailoutDialog(elements);
    return false;
  }

  renderBailoutDialog(gameData, elements);
  if (elements.bailoutModal) {
    elements.bailoutModal.hidden = false;
  }
  return true;
}

export function closeBailoutDialog(elements: Elements): void {
  if (elements.bailoutModal) {
    elements.bailoutModal.hidden = true;
  }
  if (elements.bailoutContent) {
    elements.bailoutContent.innerHTML = "";
  }
}

export function handleAcceptBailout(gameData: GameData, elements: Elements): ActionResult | null {
  if (getPendingBailoutOffer(gameData) === null) {
    return null;
  }

  const result = acceptBailoutOffer(gameData);
  closeBailoutDialog(elements);
  return result;
}

export function handleDeclineBailout(gameData: GameData, elements: Elements): ActionResult | null {
  if (getPendingBailoutOffer(gameData) === null) {
    return null;
  }

  const result = declineBailoutOffer(gameData);
  closeBailoutDialog(elements);
  return result;
}

function renderBailoutDialog(gameData: GameData, elements: Elements): void {
  if (!elements.bailoutContent || !elements.bailoutModal) {
    return;
  }

  const copy = getBailoutDialogCopy(gameData);
  if (elements.bailoutTitle) {
    elements.bailoutTitle.textContent = copy.title;
  }
  elements.bailoutContent.innerHTML = `
    <p class="bailout-story">${copy.story.replace(/\n/g, "<br />")}</p>
    <p class="bailout-amount">${uiLabels.bailout.amountLabel(copy.amount)}</p>
  `;
  if (elements.bailoutAcceptBtn) {
    elements.bailoutAcceptBtn.textContent = uiLabels.bailout.acceptAmount(copy.amount);
  }
}
