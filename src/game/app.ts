import {
  clearSavedGameData,
  exportSaveData,
  importSaveData,
  loadGameData,
  replaceSavedGameData,
  SAVE_FORMAT_VERSION,
  saveGameData
} from "./save";
import {advanceDay} from "./systems/dayLoop";
import {
  type AdventurerDiscoveryLevel,
  type AdventurerPinnedFilter,
  type AdventurerStatusFilter
} from "./core/types";
import {type QuestNatureFilter, type QuestStatusFilter} from "./questDefinitions";
import {createEmptyElements, createInitialGameData} from "./state";
import {createQuest} from "./systems/quests/taskBoard";
import {
  createUI,
  populateAdventurerFilterOptions,
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  render,
  showNotification,
  syncQuestForm
} from "./ui/ui";
import type {Elements, GameData, TabId} from "./core/types";
import {
  closeEncyclopedia,
  openEncyclopedia,
  selectEncyclopediaEntry
} from "./ui/encyclopedia";
import {
  closeGiftDialog,
  confirmGiftDialog,
  openGiftDialogForAdventurer,
  openGiftDialogForItem
} from "./ui/gifting";

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
  elements.encyclopediaButton?.addEventListener("click", () => {
    openEncyclopedia(gameData, elements);
  });
  elements.encyclopediaCloseBtn?.addEventListener("click", () => {
    closeEncyclopedia(elements);
  });
  elements.encyclopediaModal?.addEventListener("click", (event) => {
    if (event.target === elements.encyclopediaModal) {
      closeEncyclopedia(elements);
    }
  });
  elements.giftCloseBtn?.addEventListener("click", () => {
    closeGiftDialog(elements);
  });
  elements.giftModal?.addEventListener("click", (event) => {
    if (event.target === elements.giftModal) {
      closeGiftDialog(elements);
    }
  });
  elements.giftConfirmBtn?.addEventListener("click", () => {
    const result = confirmGiftDialog(gameData, elements);
    if (!result) {
      return;
    }
    if (result.ok) {
      saveGameData(gameData);
    }
    render(gameData, elements);
    showNotification(result.message, result.type);
  });
  elements.encyclopediaNavigation?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-encyclopedia-category-id]");
    const categoryId = button?.dataset.encyclopediaCategoryId;
    if (categoryId) {
      selectEncyclopediaEntry(gameData, elements, categoryId);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeEncyclopedia(elements);
      closeGiftDialog(elements);
    }
  });
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

    const giftButton = target.closest<HTMLButtonElement>(".gift-adventurer");
    if (giftButton?.dataset.giftAdventurerId) {
      openGiftDialogForAdventurer(gameData, elements, giftButton.dataset.giftAdventurerId);
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
  elements.stockList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const giftButton = target.closest<HTMLButtonElement>(".gift-stock-item");
    if (giftButton?.dataset.giftItemId) {
      openGiftDialogForItem(gameData, elements, giftButton.dataset.giftItemId);
    }
  });
  elements.createQuestBtn?.addEventListener("click", () => handleCreateQuest(gameData, elements));
  elements.exportSaveBtn?.addEventListener("click", () => handleExportSave(gameData, elements));
  elements.importSaveBtn?.addEventListener("click", () => {
    elements.importSaveInput?.click();
  });
  elements.resetSaveBtn?.addEventListener("click", () => handleResetSave(gameData, elements));
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
  link.download = `adventure-house-save-format-${SAVE_FORMAT_VERSION}-day-${gameData.day}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotification("存档已导出。", "success");
}

async function handleImportSave(gameData: GameData, elements: Elements): Promise<void> {
  const importInput = elements.importSaveInput;
  const selectedFile = importInput?.files?.[0] ?? null;
  if (!selectedFile) {
    return;
  }

  const importedText = await selectedFile.text().catch(() => null);
  if (importInput) {
    importInput.value = "";
  }
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

function handleResetSave(gameData: GameData, elements: Elements): void {
  const confirmed = window.confirm("这会清空当前浏览器中的本地存档，并重置为初始开局。是否继续？");
  if (!confirmed) {
    return;
  }

  const freshGameData = createInitialGameData();
  clearSavedGameData();
  replaceGameData(gameData, freshGameData);
  saveGameData(gameData);
  populateQuestTemplateOptions(gameData, elements);
  populateQuestFilterOptions(gameData, elements);
  populateAdventurerFilterOptions(gameData, elements);
  syncQuestForm(gameData, elements);
  render(gameData, elements);
  showNotification("本地存档已清空。", "success");
}

function replaceGameData(target: GameData, source: GameData): void {
  Object.assign(target, source);
}
