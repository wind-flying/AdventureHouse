import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {uiText} from "../../text/uiText";
import {renderStoryEntries} from "../shared/storyEntries";
import {getLatestDayEntries} from "../../systems/dayLoop";
import {
  getAct1QuickStockViewModel,
  getAct1StoryHintViewModel,
  getAct1TodayGoalViewModel,
  getInTownAdventurerChips
} from "../workbench/act1Goals";

export function getWorkbenchTabMarkup(): string {
  return `
    <section class="tab-panel panel workbench-panel" data-panel="workbench">
      <div class="workbench-grid">
        <section class="panel inset-panel workbench-block" id="today-goal-card"></section>
        <section class="panel inset-panel workbench-block" id="quick-stock-card"></section>
        <section class="panel inset-panel workbench-block workbench-people">
          <div class="panel-head">
            <h3>${uiLabels.workbench.inTownTitle}</h3>
            <p>${uiLabels.workbench.inTownDescription}</p>
          </div>
          <div id="in-town-strip" class="in-town-strip"></div>
        </section>
        <section class="panel inset-panel workbench-block workbench-story">
          <details id="workbench-story-details" class="story-rail-details">
            <summary class="story-rail-summary">
              <div class="panel-head">
                <h3>${uiLabels.workbench.storyTitle}</h3>
                <p id="workbench-story-hint"></p>
                <span class="story-expand-hint">${uiLabels.workbench.expandStory}</span>
              </div>
            </summary>
            <div id="story-rail-list" class="log-list compact-list"></div>
          </details>
        </section>
      </div>
    </section>
  `;
}

export function renderWorkbenchTab(gameData: GameData, elements: Elements): void {
  const root = elements.container;
  if (!root) {
    return;
  }

  renderTodayGoal(root, gameData);
  renderQuickStock(root, gameData);
  renderInTownStrip(root, gameData);
  renderStoryHint(root, gameData);
  renderStoryEntries(elements.storyRailList, getLatestDayEntries(gameData), uiText.emptyLatestStories);
}

function renderTodayGoal(root: HTMLElement, gameData: GameData): void {
  const card = root.querySelector("#today-goal-card");
  if (!card) {
    return;
  }

  const goal = getAct1TodayGoalViewModel(gameData);
  card.innerHTML = `
    <div class="panel-head">
      <h3>${uiLabels.workbench.todayGoalTitle}</h3>
      <p>${goal.phaseTitle}</p>
    </div>
    <strong class="workbench-goal-title">${goal.goalTitle}</strong>
    <p class="workbench-progress">${goal.progressText}</p>
    <p class="hint">${goal.suggestionText}</p>
  `;
}

function renderQuickStock(root: HTMLElement, gameData: GameData): void {
  const card = root.querySelector("#quick-stock-card");
  if (!card) {
    return;
  }

  const quick = getAct1QuickStockViewModel(gameData);
  card.innerHTML = `
    <div class="panel-head">
      <h3>${quick.title}</h3>
      <p>${uiLabels.workbench.quickPostDescription}</p>
    </div>
    <p class="quest-body">${quick.summary}</p>
    ${quick.costText ? `<p class="workbench-cost">${quick.costText}</p>` : ""}
    ${quick.disabledReason ? `<p class="hint">${quick.disabledReason}</p>` : ""}
    <div class="workbench-actions">
      <button id="quick-post-stock-btn" class="primary-button quick-post-stock" type="button"
        ${quick.canPost ? "" : "disabled"}>${quick.ctaLabel}</button>
      <button id="open-quests-btn" class="ghost-button open-quests-btn" type="button">${uiLabels.workbench.moreQuests}</button>
    </div>
  `;
}

function renderInTownStrip(root: HTMLElement, gameData: GameData): void {
  const strip = root.querySelector("#in-town-strip");
  if (!strip) {
    return;
  }

  const chips = getInTownAdventurerChips(gameData);
  if (chips.length === 0) {
    strip.innerHTML = `<p class="empty-state">${uiLabels.workbench.emptyInTown}</p>`;
    return;
  }

  strip.innerHTML = chips.map((chip) => `
    <button class="in-town-chip" type="button" data-in-town-adventurer-id="${chip.id}">
      <strong>${chip.name}</strong>
      <span class="in-town-status ${chip.statusClass}">${chip.statusText}</span>
    </button>
  `).join("");
}

function renderStoryHint(root: HTMLElement, gameData: GameData): void {
  const hint = root.querySelector("#workbench-story-hint");
  if (!hint) {
    return;
  }

  const story = getAct1StoryHintViewModel(gameData);
  hint.textContent = `${story.nodeTitle} · ${story.hintText}`;
}
