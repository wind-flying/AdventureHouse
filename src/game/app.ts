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
import {createRecommendedStockQuest} from "./ui/workbench/act1Goals";
import {
  createUI,
  populateAdventurerFilterOptions,
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  render,
  showNotification,
  refreshQuestEconomyHint,
  syncQuestForm
} from "./ui/ui";
import type {Elements, GameData, TabId} from "./core/types";
import {
  closeEncyclopedia,
  openEncyclopedia,
  selectEncyclopediaEntry
} from "./ui/encyclopedia";
import {
  closeAdventurerDetail,
  openAdventurerDetail
} from "./ui/shell/adventurerDetail";
import {normalizeTabId} from "./ui/shell/sidebar";
import {handleMarketAction} from "./ui/tabs/marketTab";
import {
  closeGiftDialog,
  confirmGiftDialog,
  openGiftDialogForAdventurer,
  openGiftDialogForItem
} from "./ui/gifting";
import {
  handleAcceptBailout,
  handleDeclineBailout,
  openBailoutDialogIfPending
} from "./ui/bailoutDialog";
import {
  bindLoadoutDialogEvents,
  dismissLoadoutOverlay,
  ensureLoadoutElements,
  openLoadoutDialog
} from "./ui/loadout";

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
  ensureLoadoutElements(container, elements);
  bindLoadoutDialogEvents(gameData, elements);
  bindEvents(gameData, elements);
  syncQuestForm(gameData, elements);
  render(gameData, elements);
  openBailoutDialogIfPending(gameData, elements, container);
}

function getClickElement(event: Event): Element | null {
  const target = event.target;
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Text) {
    return target.parentElement;
  }

  return null;
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
  elements.adventurerDetailCloseBtn?.addEventListener("click", () => {
    closeAdventurerDetail(elements);
  });
  elements.adventurerDetailModal?.addEventListener("click", (event) => {
    if (event.target === elements.adventurerDetailModal) {
      closeAdventurerDetail(elements);
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
  elements.container?.addEventListener("click", (event) => {
    const origin = getClickElement(event);
    if (!origin) {
      return;
    }

    if (origin.closest("#bailout-accept-btn")) {
      const result = handleAcceptBailout(gameData, elements);
      if (!result) {
        return;
      }
      saveGameData(gameData);
      render(gameData, elements);
      showNotification(result.message, result.type);
      return;
    }

    if (origin.closest("#bailout-decline-btn")) {
      const result = handleDeclineBailout(gameData, elements);
      if (!result) {
        return;
      }
      saveGameData(gameData);
      render(gameData, elements);
      showNotification(result.message, result.type);
      return;
    }

    const loadoutButton = origin.closest<HTMLButtonElement>(".inspect-loadout");
    if (loadoutButton?.dataset.loadoutAdventurerId) {
      openLoadoutDialog(gameData, elements, loadoutButton.dataset.loadoutAdventurerId);
      return;
    }

    const giftAdventurerButton = origin.closest<HTMLButtonElement>(".gift-adventurer");
    if (giftAdventurerButton?.dataset.giftAdventurerId) {
      openGiftDialogForAdventurer(gameData, elements, giftAdventurerButton.dataset.giftAdventurerId);
      return;
    }

    const giftStockButton = origin.closest<HTMLButtonElement>(".gift-stock-item");
    if (giftStockButton?.dataset.giftItemId) {
      openGiftDialogForItem(gameData, elements, giftStockButton.dataset.giftItemId);
      return;
    }

    const marketAction = handleMarketAction(gameData, origin);
    if (marketAction.handled) {
      if (marketAction.result?.ok) {
        saveGameData(gameData);
      }
      render(gameData, elements);
      if (marketAction.result) {
        showNotification(marketAction.result.message, marketAction.result.type);
      }
      return;
    }

    const quickPostButton = origin.closest<HTMLButtonElement>(".quick-post-stock");
    if (quickPostButton) {
      handleQuickPostStock(gameData, elements);
      return;
    }

    const openQuestsButton = origin.closest<HTMLButtonElement>(".open-quests-btn");
    if (openQuestsButton) {
      gameData.activeTab = "quests";
      render(gameData, elements);
      return;
    }

    const inTownChip = origin.closest<HTMLButtonElement>("[data-in-town-adventurer-id]");
    if (inTownChip?.dataset.inTownAdventurerId) {
      openAdventurerDetail(gameData, elements, inTownChip.dataset.inTownAdventurerId);
      return;
    }

    const pinButton = origin.closest<HTMLButtonElement>(".pin-toggle");
    const adventurerId = pinButton?.dataset.adventurerId;
    if (pinButton && adventurerId) {
      togglePinnedAdventurer(gameData, adventurerId);
      saveGameData(gameData);
      render(gameData, elements);
    }
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
      closeAdventurerDetail(elements);
      dismissLoadoutOverlay(elements);
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
  elements.rewardInput?.addEventListener("input", () => refreshQuestEconomyHint(gameData, elements));
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
    openBailoutDialogIfPending(gameData, elements, elements.container);
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.tab as TabId | undefined;
      if (!nextTab) {
        return;
      }
      gameData.activeTab = normalizeTabId(nextTab);
      render(gameData, elements);
    });
  });
}

function handleQuickPostStock(gameData: GameData, elements: Elements): void {
  const result = createRecommendedStockQuest(gameData);
  if (result.ok) {
    saveGameData(gameData);
  }
  render(gameData, elements);
  showNotification(result.message, result.type);
}

function handleCreateQuest(gameData: GameData, elements: Elements): void {
  if (!elements.templateSelect || !elements.rewardInput || !elements.quantityInput) {
    return;
  }

  const result = createQuest(gameData, {
    templateId: elements.templateSelect.value,
    reward: Number.parseInt(elements.rewardInput.value, 10),
    quantity: Number.parseInt(elements.quantityInput.value, 10),
    provideRations: elements.provisionRationsCheckbox?.checked === true
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
