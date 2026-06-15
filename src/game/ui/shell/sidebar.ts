import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";

export function getSidebarMarkup(): string {
  return `
    <aside class="nav-sidebar">
      <div class="tab-list">
        <button class="tab-button" data-tab="overview" type="button">${uiLabels.navigation.overview}</button>
        <button class="tab-button" data-tab="quests" type="button">${uiLabels.navigation.quests}</button>
        <button class="tab-button" data-tab="adventurers" type="button">${uiLabels.navigation.adventurers}</button>
        <button class="tab-button" data-tab="intel" type="button">${uiLabels.navigation.intel}</button>
        <button class="tab-button" data-tab="stock" type="button">${uiLabels.navigation.stock}</button>
        <button class="tab-button" data-tab="log" type="button">${uiLabels.navigation.log}</button>
        <button class="tab-button" data-tab="save" type="button">${uiLabels.navigation.save}</button>
      </div>
    </aside>
  `;
}

export function renderTabs(gameData: GameData, elements: Elements): void {
  if (!elements.container) {
    return;
  }

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === gameData.activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.container.querySelectorAll<HTMLElement>(".tab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== gameData.activeTab;
  });
}
