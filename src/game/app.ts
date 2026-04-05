import {exportSaveData, importSaveData, loadGameData, replaceSavedGameData, saveGameData} from "./save";
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

  const gameData = loadGameData() ?? createInitialGameData();
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
    saveGameData(gameData);
    render(gameData, elements);
  });
  elements.createQuestBtn?.addEventListener("click", () => handleCreateQuest(gameData, elements));
  elements.exportSaveBtn?.addEventListener("click", () => handleExportSave(gameData, elements));
  elements.importSaveBtn?.addEventListener("click", () => {
    elements.importSaveInput?.click();
  });
  elements.importSaveInput?.addEventListener("change", async () => {
    await handleImportSave(gameData, elements);
  });
  elements.nextDayBtn?.addEventListener("click", () => {
    advanceDay(gameData);
    saveGameData(gameData);
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

  if (result.ok) {
    saveGameData(gameData);
  }
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

function handleExportSave(gameData: GameData, _elements: Elements): void {
  const blob = new Blob([exportSaveData(gameData)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adventure-house-save-v1-day-${gameData.day}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotification("存档已导出。", "success");
}

async function handleImportSave(gameData: GameData, elements: Elements): Promise<void> {
  const selectedFile = elements.importSaveInput?.files?.[0] ?? null;
  if (!selectedFile) {
    return;
  }

  const importedText = await selectedFile.text().catch(() => null);
  elements.importSaveInput.value = "";
  if (!importedText) {
    showNotification("导入失败：无法读取存档文件。", "error");
    return;
  }

  const importedGameData = importSaveData(importedText);
  if (!importedGameData) {
    showNotification("导入失败：存档格式无效或版本不兼容。", "error");
    return;
  }

  replaceGameData(gameData, importedGameData);
  replaceSavedGameData(gameData);
  populateQuestTemplateOptions(gameData, elements);
  populateQuestFilterOptions(gameData, elements);
  populateAdventurerFilterOptions(gameData, elements);
  syncQuestForm(gameData, elements);
  render(gameData, elements);
  showNotification("存档已导入。", "success");
}

function replaceGameData(target: GameData, source: GameData): void {
  const mutableTarget = target as Record<string, unknown>;
  const targetKeys = Object.keys(mutableTarget);
  targetKeys.forEach((key) => {
    delete mutableTarget[key];
  });

  Object.assign(mutableTarget, source);
}
