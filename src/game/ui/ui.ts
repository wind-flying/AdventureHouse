import type {Elements, GameData} from "../core/types";
import {createAppShell} from "./appShell";
import {renderHeader} from "./shell/header";
import {renderTabs} from "./shell/sidebar";
import {
  populateAdventurerFilterOptions,
  renderAdventurersTab
} from "./tabs/adventurersTab";
import {renderIntelTab} from "./tabs/intelTab";
import {renderLogTab} from "./tabs/logTab";
import {renderWorkbenchTab} from "./tabs/workbenchTab";
import {
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  refreshQuestEconomyHint,
  renderQuestsTab,
  syncQuestForm
} from "./tabs/questsTab";
import {renderStockTab} from "./tabs/stockTab";
import {renderMarketTab} from "./tabs/marketTab";
import {renderEncyclopedia} from "./encyclopedia";
import {renderAdventurerDetailIfOpen} from "./shell/adventurerDetail";

export {showNotification} from "./shared/notification";
export {
  populateAdventurerFilterOptions,
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  refreshQuestEconomyHint,
  syncQuestForm
};

export function createUI(container: HTMLDivElement, gameData: GameData, elements: Elements): void {
  createAppShell(container, gameData, elements);
}

export function render(gameData: GameData, elements: Elements): void {
  populateQuestTemplateOptions(gameData, elements);
  syncQuestForm(gameData, elements);
  renderHeader(gameData, elements);
  renderTabs(gameData, elements);
  renderWorkbenchTab(gameData, elements);
  renderQuestsTab(gameData, elements);
  renderAdventurersTab(gameData, elements);
  renderIntelTab(gameData, elements);
  renderStockTab(gameData, elements);
  renderMarketTab(gameData, elements);
  renderLogTab(gameData, elements);
  renderEncyclopedia(gameData, elements);
  renderAdventurerDetailIfOpen(gameData, elements);
}
