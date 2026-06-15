import type {Elements, GameData} from "../core/types";
import {createAppShell} from "./appShell";
import {renderHeader} from "./shell/header";
import {renderTabs} from "./shell/sidebar";
import {renderStoryRail} from "./shell/storyRail";
import {
  populateAdventurerFilterOptions,
  renderAdventurersTab
} from "./tabs/adventurersTab";
import {renderIntelTab} from "./tabs/intelTab";
import {renderLogTab} from "./tabs/logTab";
import {renderOverviewTab} from "./tabs/overviewTab";
import {
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
  renderQuestsTab,
  syncQuestForm
} from "./tabs/questsTab";
import {renderStockTab} from "./tabs/stockTab";

export {showNotification} from "./shared/notification";
export {
  populateAdventurerFilterOptions,
  populateQuestFilterOptions,
  populateQuestTemplateOptions,
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
  renderOverviewTab(gameData, elements);
  renderQuestsTab(gameData, elements);
  renderAdventurersTab(gameData, elements);
  renderIntelTab(gameData, elements);
  renderStockTab(gameData, elements);
  renderLogTab(gameData, elements);
  renderStoryRail(gameData, elements);
}
