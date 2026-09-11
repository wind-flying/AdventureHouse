import type {Elements, GameData, TabId} from "../../core/types";
import {encyclopediaText} from "../../text/encyclopediaText";
import {uiLabels} from "../../text/uiLabels";

const REFERENCE_TABS: TabId[] = ["quests", "adventurers", "intel", "log"];
const SETTINGS_TABS: TabId[] = ["save"];

export function getSidebarMarkup(): string {
  return `
    <aside class="nav-sidebar">
      <div class="tab-list tab-list-primary">
        <button class="tab-button" data-tab="workbench" type="button">${uiLabels.navigation.workbench}</button>
        <button class="tab-button tab-button-secondary" data-tab="relief" type="button">${uiLabels.navigation.relief}</button>
      </div>
      <details id="nav-reference-group" class="nav-group">
        <summary>${uiLabels.navigation.reference}</summary>
        <div class="tab-list tab-list-nested">
          <button class="tab-button" data-tab="quests" type="button">${uiLabels.navigation.quests}</button>
          <button class="tab-button" data-tab="adventurers" type="button">${uiLabels.navigation.adventurers}</button>
          <button class="tab-button" data-tab="intel" type="button">${uiLabels.navigation.intel}</button>
          <button class="tab-button" data-tab="log" type="button">${uiLabels.navigation.log}</button>
          <button id="encyclopedia-button" class="tab-button encyclopedia-nav-button" type="button"
            aria-label="${encyclopediaText.triggerLabel}" title="${encyclopediaText.triggerLabel}">
            ${uiLabels.navigation.encyclopedia}
          </button>
        </div>
      </details>
      <details id="nav-settings-group" class="nav-group">
        <summary>${uiLabels.navigation.settings}</summary>
        <div class="tab-list tab-list-nested">
          <button class="tab-button" data-tab="save" type="button">${uiLabels.navigation.save}</button>
        </div>
      </details>
    </aside>
  `;
}

export function renderTabs(gameData: GameData, elements: Elements): void {
  if (!elements.container) {
    return;
  }

  const activeTab = normalizeTabId(gameData.activeTab);
  if (activeTab !== gameData.activeTab) {
    gameData.activeTab = activeTab;
  }

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === gameData.activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.container.querySelectorAll<HTMLElement>(".tab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== gameData.activeTab;
  });

  const referenceGroup = elements.container.querySelector<HTMLDetailsElement>("#nav-reference-group");
  if (referenceGroup && REFERENCE_TABS.includes(gameData.activeTab)) {
    referenceGroup.open = true;
  }

  const settingsGroup = elements.container.querySelector<HTMLDetailsElement>("#nav-settings-group");
  if (settingsGroup && SETTINGS_TABS.includes(gameData.activeTab)) {
    settingsGroup.open = true;
  }
}

export function normalizeTabId(tab: string): TabId {
  if (tab === "overview") {
    return "workbench";
  }
  if (tab === "stock" || tab === "market") {
    return "relief";
  }
  if (isTabId(tab)) {
    return tab;
  }
  return "workbench";
}

function isTabId(tab: string): tab is TabId {
  return tab === "workbench"
    || tab === "relief"
    || tab === "quests"
    || tab === "adventurers"
    || tab === "intel"
    || tab === "log"
    || tab === "save";
}
