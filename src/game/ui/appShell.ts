import type {Elements, GameData} from "../core/types";
import {getHeaderMarkup} from "./shell/header";
import {getSidebarMarkup} from "./shell/sidebar";
import {getStoryRailMarkup} from "./shell/storyRail";
import {getAdventurersTabMarkup} from "./tabs/adventurersTab";
import {getIntelTabMarkup} from "./tabs/intelTab";
import {getLogTabMarkup} from "./tabs/logTab";
import {getOverviewTabMarkup} from "./tabs/overviewTab";
import {getQuestsTabMarkup} from "./tabs/questsTab";
import {getSaveTabMarkup} from "./tabs/saveTab";
import {getStockTabMarkup} from "./tabs/stockTab";
import {getEncyclopediaMarkup} from "./encyclopedia";
import {getGiftingMarkup} from "./gifting";

export function createAppShell(container: HTMLDivElement, gameData: GameData, elements: Elements): void {
  elements.container = container;
  container.className = "app-shell";
  container.innerHTML = `
    <main class="workspace">
      ${getSidebarMarkup()}
      <section class="content-stage">
        ${getOverviewTabMarkup(gameData)}
        ${getQuestsTabMarkup()}
        ${getAdventurersTabMarkup()}
        ${getIntelTabMarkup()}
        ${getStockTabMarkup()}
        ${getLogTabMarkup()}
        ${getSaveTabMarkup()}
      </section>
      <aside class="right-rail">
        ${getHeaderMarkup()}
        ${getStoryRailMarkup()}
      </aside>
    </main>
    ${getEncyclopediaMarkup()}
    ${getGiftingMarkup()}
  `;

  elements.dayDisplay = container.querySelector("#day-display");
  elements.moneyDisplay = container.querySelector("#money-display");
  elements.activeQuestDisplay = container.querySelector("#active-quest-display");
  elements.knownAdventurerDisplay = container.querySelector("#known-adventurer-display");
  elements.encyclopediaButton = container.querySelector("#encyclopedia-button");
  elements.encyclopediaModal = container.querySelector("#encyclopedia-modal");
  elements.encyclopediaCloseBtn = container.querySelector("#encyclopedia-close-btn");
  elements.encyclopediaNavigation = container.querySelector("#encyclopedia-navigation");
  elements.encyclopediaContent = container.querySelector("#encyclopedia-content");
  elements.giftModal = container.querySelector("#gift-modal");
  elements.giftContent = container.querySelector("#gift-content");
  elements.giftCloseBtn = container.querySelector("#gift-close-btn");
  elements.giftConfirmBtn = container.querySelector("#gift-confirm-btn");
  elements.exportSaveBtn = container.querySelector("#export-save-btn");
  elements.importSaveBtn = container.querySelector("#import-save-btn");
  elements.resetSaveBtn = container.querySelector("#reset-save-btn");
  elements.importSaveInput = container.querySelector("#import-save-input");
  elements.templateSelect = container.querySelector("#template-select");
  elements.questStatusFilterSelect = container.querySelector("#quest-status-filter");
  elements.questNatureFilterSelect = container.querySelector("#quest-nature-filter");
  elements.adventurerLevelFilterSelect = container.querySelector("#adventurer-level-filter");
  elements.adventurerStatusFilterSelect = container.querySelector("#adventurer-status-filter");
  elements.adventurerPinnedFilterSelect = container.querySelector("#adventurer-pinned-filter");
  elements.rewardInput = container.querySelector("#reward-input");
  elements.quantityInput = container.querySelector("#quantity-input");
  elements.templateDescription = container.querySelector("#template-description");
  elements.durationHint = container.querySelector("#duration-hint");
  elements.createQuestBtn = container.querySelector("#create-quest-btn");
  elements.nextDayBtn = container.querySelector("#next-day-btn");
  elements.overviewQuestList = container.querySelector("#overview-quest-list");
  elements.storyRailList = container.querySelector("#story-rail-list");
  elements.questList = container.querySelector("#quest-list");
  elements.adventurerList = container.querySelector("#adventurer-list");
  elements.intelList = container.querySelector("#intel-list");
  elements.stockList = container.querySelector("#stock-list");
  elements.logList = container.querySelector("#log-list");
  elements.tabButtons = Array.from(container.querySelectorAll(".tab-button"));
}
