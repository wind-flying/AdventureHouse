import type {Elements, GameData} from "../../core/types";
import {getLatestDayEntries} from "../../systems/dayLoop";
import {uiLabels} from "../../text/uiLabels";
import {uiText} from "../../text/uiText";
import {renderStoryEntries} from "../shared/storyEntries";

export function getStoryRailMarkup(): string {
  return `
    <aside class="story-sidebar panel">
      <section class="story-rail">
        <div class="panel-head">
          <h2>${uiLabels.panels.latestStoriesTitle}</h2>
        </div>
        <div id="story-rail-list" class="log-list compact-list"></div>
      </section>
    </aside>
  `;
}

export function renderStoryRail(gameData: GameData, elements: Elements): void {
  renderStoryEntries(elements.storyRailList, getLatestDayEntries(gameData), uiText.emptyLatestStories);
}
