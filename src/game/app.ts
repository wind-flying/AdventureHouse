import {advanceDay} from "./systems/dayLoop";
import {
  type AdventurerDiscoveryLevel,
  type AdventurerPinnedFilter,
  type AdventurerStatusFilter
} from "./types";
import {type QuestNatureFilter, type QuestStatusFilter} from "./questDefinitions";
import {createEmptyElements, createInitialGameData} from "./state";
import {createQuest} from "./systems/taskBoard";
import {
  createUI,
  populateAdventurerFilterOptions,
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  render,
  showNotification,
  syncQuestForm
} from "./ui/ui";
import type {Elements, GameData, TabId} from "./types";

export function initApp(): void {
  const container = document.getElementById("game-container");
  if (!(container instanceof HTMLDivElement)) {
    throw new Error("Missing #game-container root element.");
  }

  const gameData = createInitialGameData();
  const elements = createEmptyElements();

  createUI(container, gameData, elements);
  populateQuestTemplateOptions(gameData, elements);
  populateQuestFilterOptions(gameData, elements);
  populateAdventurerFilterOptions(gameData, elements);
  bindEvents(gameData, elements);
  syncQuestForm(gameData, elements);
  render(gameData, elements);
}

function bindEvents(gameData: GameData, elements: Elements): void {
  elements.templateSelect?.addEventListener("change", () => syncQuestForm(gameData, elements));
  elements.questStatusFilterSelect?.addEventListener("change", () => {
    gameData.questFilters.status = elements.questStatusFilterSelect?.value as QuestStatusFilter;
    render(gameData, elements);
  });
  elements.questNatureFilterSelect?.addEventListener("change", () => {
    gameData.questFilters.nature = elements.questNatureFilterSelect?.value as QuestNatureFilter;
    render(gameData, elements);
  });
  elements.adventurerLevelFilterSelect?.addEventListener("change", () => {
    gameData.adventurerFilters.level = elements.adventurerLevelFilterSelect?.value as "all" | AdventurerDiscoveryLevel;
    render(gameData, elements);
  });
  elements.adventurerStatusFilterSelect?.addEventListener("change", () => {
    gameData.adventurerFilters.status = elements.adventurerStatusFilterSelect?.value as AdventurerStatusFilter;
    render(gameData, elements);
  });
  elements.adventurerPinnedFilterSelect?.addEventListener("change", () => {
    gameData.adventurerFilters.pinned = elements.adventurerPinnedFilterSelect?.value as AdventurerPinnedFilter;
    render(gameData, elements);
  });
  elements.quantityInput?.addEventListener("input", () => syncQuestForm(gameData, elements));
  elements.adventurerList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>(".pin-toggle");
    if (!button) {
      return;
    }

    const adventurerId = button.dataset.adventurerId;
    if (!adventurerId) {
      return;
    }

    togglePinnedAdventurer(gameData, adventurerId);
    render(gameData, elements);
  });
  elements.createQuestBtn?.addEventListener("click", () => handleCreateQuest(gameData, elements));
  elements.nextDayBtn?.addEventListener("click", () => {
    advanceDay(gameData);
    render(gameData, elements);
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.tab as TabId | undefined;
      if (!nextTab) {
        return;
      }
      gameData.activeTab = nextTab;
      render(gameData, elements);
    });
  });
}

function handleCreateQuest(gameData: GameData, elements: Elements): void {
  if (!elements.templateSelect || !elements.rewardInput || !elements.quantityInput) {
    return;
  }

  const result = createQuest(gameData, {
    templateId: elements.templateSelect.value,
    reward: Number.parseInt(elements.rewardInput.value, 10),
    quantity: Number.parseInt(elements.quantityInput.value, 10)
  });

  render(gameData, elements);
  showNotification(result.message, result.type);
}

function togglePinnedAdventurer(gameData: GameData, adventurerId: string): void {
  if (gameData.pinnedAdventurerIds.includes(adventurerId)) {
    gameData.pinnedAdventurerIds = gameData.pinnedAdventurerIds.filter((id) => id !== adventurerId);
    return;
  }

  gameData.pinnedAdventurerIds = [...gameData.pinnedAdventurerIds, adventurerId];
}
