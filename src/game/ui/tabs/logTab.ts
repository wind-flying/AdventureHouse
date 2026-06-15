import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {uiText} from "../../text/uiText";
import {renderStoryEntries} from "../shared/storyEntries";

export function getLogTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="log" hidden>
      <div class="panel-head"><h2>${uiLabels.panels.logTitle}</h2><p>${uiLabels.panels.logDescription}</p></div>
      <div id="log-list" class="log-list"></div>
    </section>
  `;
}

export function renderLogTab(gameData: GameData, elements: Elements): void {
  renderStoryEntries(elements.logList, gameData.dayLog, uiText.emptyLogs);
}
