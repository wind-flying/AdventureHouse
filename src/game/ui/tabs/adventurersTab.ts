import type {Elements, GameData} from "../../core/types";
import {
  getAdventurerLevelFilterOptions,
  getAdventurerPinnedFilterOptions,
  getAdventurerStatusFilterOptions
} from "../../adventurerDefinitions";
import {uiLabels} from "../../text/uiLabels";
import {uiText} from "../../text/uiText";
import {
  getAdventurerCardViewModel,
  getKnownAdventurers,
  type AdventurerCardViewModel
} from "../viewModels";

export function getAdventurersTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="adventurers" hidden>
      <div class="panel-head"><h2>${uiLabels.panels.adventurersTitle}</h2><p>${uiLabels.panels.adventurersDescription}</p></div>
      <div class="adventurer-filter-row">
        <label class="field compact-field"><span>${uiLabels.form.adventurerLevelFilter}</span><select id="adventurer-level-filter"></select></label>
        <label class="field compact-field"><span>${uiLabels.form.adventurerStatusFilter}</span><select id="adventurer-status-filter"></select></label>
        <label class="field compact-field"><span>${uiLabels.form.adventurerPinnedFilter}</span><select id="adventurer-pinned-filter"></select></label>
      </div>
      <div id="adventurer-list" class="adventurer-list"></div>
    </section>
  `;
}

export function populateAdventurerFilterOptions(gameData: GameData, elements: Elements): void {
  populateSelect(elements.adventurerLevelFilterSelect, getAdventurerLevelFilterOptions(), gameData.adventurerFilters.level);
  populateSelect(elements.adventurerStatusFilterSelect, getAdventurerStatusFilterOptions(), gameData.adventurerFilters.status);
  populateSelect(elements.adventurerPinnedFilterSelect, getAdventurerPinnedFilterOptions(), gameData.adventurerFilters.pinned);
}

export function renderAdventurersTab(gameData: GameData, elements: Elements): void {
  if (!elements.adventurerList) {
    return;
  }

  elements.adventurerList.innerHTML = "";
  const knownAdventurers = getFilteredAdventurers(gameData);
  if (knownAdventurers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = uiText.emptyAdventurers;
    elements.adventurerList.appendChild(empty);
    return;
  }

  const pinned = knownAdventurers.filter((item) => gameData.pinnedAdventurerIds.includes(item.id));
  const unpinned = knownAdventurers.filter((item) => !gameData.pinnedAdventurerIds.includes(item.id));
  if (gameData.adventurerFilters.pinned !== "unpinned" && pinned.length > 0) {
    elements.adventurerList.appendChild(buildAdventurerSection(gameData, uiLabels.adventurerCard.pinnedSection, pinned));
  }
  if (gameData.adventurerFilters.pinned !== "pinned" && unpinned.length > 0) {
    elements.adventurerList.appendChild(buildAdventurerSection(gameData, uiLabels.adventurerCard.othersSection, unpinned));
  }
}

function populateSelect(
  select: HTMLSelectElement | null,
  options: Array<{value: string; label: string}>,
  value: string
): void {
  if (!select) return;
  select.innerHTML = "";
  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  });
  select.value = value;
}

function getFilteredAdventurers(gameData: GameData) {
  return getKnownAdventurers(gameData).filter((adventurer) => {
    const matchLevel = gameData.adventurerFilters.level === "all" || adventurer.knownLevel === gameData.adventurerFilters.level;
    const isAway = adventurer.currentQuestId !== null;
    const matchStatus = gameData.adventurerFilters.status === "all"
      || (gameData.adventurerFilters.status === "away" && isAway)
      || (gameData.adventurerFilters.status === "idle" && !isAway);
    const isPinned = gameData.pinnedAdventurerIds.includes(adventurer.id);
    const matchPinned = gameData.adventurerFilters.pinned === "all"
      || (gameData.adventurerFilters.pinned === "pinned" && isPinned)
      || (gameData.adventurerFilters.pinned === "unpinned" && !isPinned);
    return matchLevel && matchStatus && matchPinned;
  });
}

function buildAdventurerSection(
  gameData: GameData,
  title: string,
  adventurers: ReturnType<typeof getKnownAdventurers>
): HTMLElement {
  const section = document.createElement("section");
  section.className = "adventurer-section";
  section.innerHTML = `<h3 class="mini-title">${title}</h3>`;
  const list = document.createElement("div");
  list.className = "adventurer-list";
  adventurers.forEach((adventurer) => {
    const card = document.createElement("article");
    card.className = "adventurer-card";
    card.innerHTML = buildAdventurerMarkup(getAdventurerCardViewModel(gameData, adventurer));
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

export function buildAdventurerMarkup(adventurer: AdventurerCardViewModel): string {
  const head = `
    <div class="adventurer-head">
      <strong>${adventurer.name}</strong>
      <div class="adventurer-head-actions">
        ${adventurer.canReceiveGift
          ? `<button class="ghost-button gift-adventurer" type="button" data-gift-adventurer-id="${adventurer.id}">${adventurer.giftActionText}</button>`
          : ""}
        ${adventurer.canInspectLoadout
          ? `<button class="ghost-button inspect-loadout" type="button" data-loadout-adventurer-id="${adventurer.id}">${adventurer.loadoutActionText}</button>`
          : ""}
        <button class="ghost-button pin-toggle" type="button" data-adventurer-id="${adventurer.id}">${adventurer.pinActionText}</button>
        <span class="status-pill ${adventurer.levelClass}">${adventurer.levelText}</span>
      </div>
    </div>
    <p class="quest-body">${adventurer.title}</p>
  `;
  if (adventurer.rumorText) {
    return `${head}<div class="adventurer-meta">${adventurer.rumorText}</div>`;
  }
  return `
    ${head}
    ${adventurer.impressionText ? `<div class="adventurer-meta">${adventurer.impressionText}</div>` : ""}
    ${adventurer.preferenceText ? `<div class="adventurer-meta">${adventurer.preferenceText}</div>` : ""}
    ${adventurer.personalityText ? `<div class="adventurer-meta">${adventurer.personalityText}</div>` : ""}
    ${adventurer.currentStatusText ? `<div class="adventurer-meta">${adventurer.currentStatusText}</div>` : ""}
    ${adventurer.lastCompletedText ? `<div class="adventurer-meta">${adventurer.lastCompletedText}</div>` : ""}
    ${adventurer.motiveText ? `<div class="adventurer-meta">${adventurer.motiveText}</div>` : ""}
  `;
}
