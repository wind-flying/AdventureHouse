import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {uiText} from "../../text/uiText";
import {sortQuestsForDisplay} from "../questSorting";
import {renderQuestCollection} from "../shared/questCards";

const OVERVIEW_QUEST_COUNT = 3;

export function getOverviewTabMarkup(gameData: GameData): string {
  return `
    <section class="tab-panel panel" data-panel="overview">
      <div class="panel-head">
        <h2>${uiLabels.panels.overviewTitle}</h2>
        <p>${uiLabels.panels.overviewDescription}</p>
      </div>
      <div class="overview-grid">
        <section class="panel inset-panel">
          <div class="panel-head">
            <h3>${uiLabels.panels.todaySummaryTitle}</h3>
            <p>${uiLabels.panels.todaySummaryDescription}</p>
          </div>
          <div class="overview-note-list">
            <div class="overview-note">
              <span>${uiLabels.overviewNotes.income}</span>
              <strong>${uiLabels.overviewNotes.incomeRetailOnly}</strong>
            </div>
            <div class="overview-note">
              <span>${uiLabels.overviewNotes.pace}</span>
              <strong>${uiLabels.overviewNotes.paceValue}</strong>
            </div>
            <div class="overview-note">
              <span>${uiLabels.overviewNotes.focus}</span>
              <strong>${uiLabels.overviewNotes.focusValue}</strong>
            </div>
          </div>
        </section>
        <section class="panel inset-panel">
          <div class="panel-head">
            <h3>${uiLabels.panels.recentQuestsTitle}</h3>
            <p>${uiLabels.panels.recentQuestsDescription}</p>
          </div>
          <div id="overview-quest-list" class="quest-list compact-list"></div>
        </section>
      </div>
    </section>
  `;
}

export function renderOverviewTab(gameData: GameData, elements: Elements): void {
  renderQuestCollection(
    gameData,
    elements.overviewQuestList,
    sortQuestsForDisplay(gameData.player.quests, gameData.day).slice(0, OVERVIEW_QUEST_COUNT),
    uiText.emptyOverviewQuests
  );
}
