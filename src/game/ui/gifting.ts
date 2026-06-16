import {giftItemsToAdventurer, giftItemToAdventurers, getGiftableAdventurers, getGiftableItems} from "../systems/gifting";
import {uiLabels} from "../text/uiLabels";
import type {ActionResult, Elements, GameData} from "../core/types";

type GiftDialogState =
  | {
    mode: "adventurer";
    adventurerId: string;
  }
  | {
    mode: "item";
    itemId: string;
  };

let giftDialogState: GiftDialogState | null = null;

export function getGiftingMarkup(): string {
  return `
    <div id="gift-modal" class="gift-overlay" hidden>
      <section class="gift-dialog" role="dialog" aria-modal="true" aria-labelledby="gift-dialog-title">
        <header class="gift-header">
          <h2 id="gift-dialog-title">${uiLabels.gifting.title}</h2>
        </header>
        <div id="gift-content" class="gift-content"></div>
        <footer class="gift-footer">
          <button id="gift-close-btn" class="secondary-button" type="button">${uiLabels.gifting.close}</button>
          <button id="gift-confirm-btn" class="primary-button" type="button">${uiLabels.gifting.confirm}</button>
        </footer>
      </section>
    </div>
  `;
}

export function openGiftDialogForAdventurer(gameData: GameData, elements: Elements, adventurerId: string): void {
  giftDialogState = {mode: "adventurer", adventurerId};
  renderGiftDialog(gameData, elements);
  if (elements.giftModal) {
    elements.giftModal.hidden = false;
  }
}

export function openGiftDialogForItem(gameData: GameData, elements: Elements, itemId: string): void {
  giftDialogState = {mode: "item", itemId};
  renderGiftDialog(gameData, elements);
  if (elements.giftModal) {
    elements.giftModal.hidden = false;
  }
}

export function closeGiftDialog(elements: Elements): void {
  giftDialogState = null;
  if (elements.giftModal) {
    elements.giftModal.hidden = true;
  }
  if (elements.giftContent) {
    elements.giftContent.innerHTML = "";
  }
}

export function confirmGiftDialog(gameData: GameData, elements: Elements): ActionResult | null {
  if (!giftDialogState || !elements.giftContent) {
    return null;
  }

  const currentState = giftDialogState;
  if (currentState.mode === "adventurer") {
    const itemIds = getCheckedValues(elements.giftContent, "gift-item");
    closeGiftDialog(elements);
    return giftItemsToAdventurer(gameData, currentState.adventurerId, itemIds);
  }

  const adventurerIds = getCheckedValues(elements.giftContent, "gift-adventurer");
  closeGiftDialog(elements);
  return giftItemToAdventurers(gameData, currentState.itemId, adventurerIds);
}

function renderGiftDialog(gameData: GameData, elements: Elements): void {
  if (!giftDialogState || !elements.giftContent) {
    return;
  }

  if (giftDialogState.mode === "adventurer") {
    renderItemsForAdventurer(gameData, elements, giftDialogState.adventurerId);
    return;
  }

  renderAdventurersForItem(gameData, elements, giftDialogState.itemId);
}

function renderItemsForAdventurer(gameData: GameData, elements: Elements, adventurerId: string): void {
  const adventurer = gameData.adventurers.find((candidate) => candidate.id === adventurerId);
  const giftableItems = getGiftableItems(gameData);
  if (!elements.giftContent) {
    return;
  }

  if (!adventurer || adventurer.currentQuestId !== null) {
    elements.giftContent.innerHTML = `<p class="empty-state">${uiLabels.gifting.noAvailableAdventurer}</p>`;
    return;
  }

  if (giftableItems.length === 0) {
    elements.giftContent.innerHTML = `<p class="empty-state">${uiLabels.gifting.noAvailableItem}</p>`;
    return;
  }

  elements.giftContent.innerHTML = `
    <p class="gift-help">${uiLabels.gifting.itemModeHelp(adventurer.name)}</p>
    <div class="gift-choice-list">
      ${giftableItems.map(({item, amount}) => `
        <label class="gift-choice">
          <input type="checkbox" name="gift-item" value="${item.id}">
          <span><strong>${item.icon} ${item.name}</strong><small>${item.playerDescription}</small></span>
          <em>${amount}</em>
        </label>
      `).join("")}
    </div>
  `;
}

function renderAdventurersForItem(gameData: GameData, elements: Elements, itemId: string): void {
  const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
  const amount = gameData.player.inventory.itemStacks[itemId] ?? 0;
  const adventurers = getGiftableAdventurers(gameData);
  if (!elements.giftContent) {
    return;
  }

  if (!item || amount <= 0) {
    elements.giftContent.innerHTML = `<p class="empty-state">${uiLabels.gifting.noAvailableItem}</p>`;
    return;
  }

  if (adventurers.length === 0) {
    elements.giftContent.innerHTML = `<p class="empty-state">${uiLabels.gifting.noAvailableAdventurer}</p>`;
    return;
  }

  elements.giftContent.innerHTML = `
    <p class="gift-help">${uiLabels.gifting.adventurerModeHelp(item.name, amount)}</p>
    <div class="gift-choice-list">
      ${adventurers.map(({adventurer, carriedCount}) => `
        <label class="gift-choice">
          <input type="checkbox" name="gift-adventurer" value="${adventurer.id}">
          <span><strong>${adventurer.name}</strong><small>${adventurer.title}</small></span>
          <em>${uiLabels.gifting.carriedCount(carriedCount)}</em>
        </label>
      `).join("")}
    </div>
  `;
}

function getCheckedValues(container: HTMLElement, name: string): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`))
    .map((input) => input.value);
}
