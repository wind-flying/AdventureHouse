import {
  getAdventurerLevelFilterOptions,
  getAdventurerPinnedFilterOptions,
  getAdventurerStatusFilterOptions
} from "../adventurerDefinitions";
import {getLatestDayEntries} from "../systems/dayLoop";
import {getQuestNatureFilterOptions, getQuestStatusFilterOptions} from "../questDefinitions";
import {uiLabels} from "../text/uiLabels";
import {
  getQuestNatureText,
  getQuestRiskText
} from "../text/statusText";
import {
  getBlockedQuestTemplateSummary,
  getQuestFormHint,
  getQuestPublishModeText,
  getDesignerNoteText,
  getQuantityHint,
  getQuestTemplateSummary,
  uiText
} from "../text/uiText";
import {
  getEstimatedDaysForTemplate,
  getQuestPublishMode,
  getRecommendedRewardForTemplate,
  isQuestTemplatePublicationBlocked
} from "../systems/taskBoard";
import {isQuestTemplateUnlocked} from "../systems/questUnlocks";
import {
  type AdventurerCardViewModel,
  getAdventurerCardViewModel,
  getHeaderSummaryViewModel,
  getIntelItemViewModel,
  getKnownAdventurers,
  type QuestCardViewModel,
  getQuestCardViewModel,
  getStockItemViewModel
} from "./viewModels";
import {getQuestTemplateFocusLabel, getResourceLabel} from "./resourceDisplay";
import type {Elements, GameData, NotificationType, Quest, StoryEntry, TabId} from "../types";

// 临时 UI 常量：控制通知和摘要列表显示。
// 这类值虽然不一定是玩法参数，但也应集中放在显眼位置，便于统一调整。
const UI_TUNING = {
  notificationExitDelayMs: 250,
  notificationVisibleDurationMs: 2200,
  overviewQuestCount: 3
} as const;

export function createUI(container: HTMLDivElement, gameData: GameData, elements: Elements): void {
  elements.container = container;
  container.className = "app-shell";
  container.innerHTML = `
    <header class="topbar">
      <div class="brand-block">
        <p class="eyebrow">${uiLabels.brandEyebrow}</p>
        <h1>${uiLabels.brandTitle}</h1>
        <p class="hero-copy">${uiLabels.brandDescription}</p>
      </div>
      <div class="toolbar">
        <div class="toolbar-stats">
          <article class="summary-card">
            <span>${uiLabels.summary.day}</span>
            <strong id="day-display"></strong>
          </article>
          <article class="summary-card">
            <span>${uiLabels.summary.money}</span>
            <strong id="money-display"></strong>
          </article>
          <article class="summary-card">
            <span>${uiLabels.summary.activeQuests}</span>
            <strong id="active-quest-display"></strong>
          </article>
          <article class="summary-card">
            <span>${uiLabels.summary.stockTotal}</span>
            <strong id="stock-summary-display"></strong>
          </article>
          <article class="summary-card">
            <span>${uiLabels.summary.knownAdventurers}</span>
            <strong id="known-adventurer-display"></strong>
          </article>
        </div>
        <button id="next-day-btn" class="primary-button" type="button">${uiLabels.form.nextDay}</button>
      </div>
    </header>

    <main class="workspace">
      <aside class="nav-sidebar panel">
        <div class="panel-head">
          <h2>${uiLabels.navigation.title}</h2>
          <p>${uiLabels.navigation.description}</p>
        </div>
        <div class="tab-list">
          <button class="tab-button" data-tab="overview" type="button">${uiLabels.navigation.overview}</button>
          <button class="tab-button" data-tab="quests" type="button">${uiLabels.navigation.quests}</button>
          <button class="tab-button" data-tab="adventurers" type="button">${uiLabels.navigation.adventurers}</button>
          <button class="tab-button" data-tab="intel" type="button">${uiLabels.navigation.intel}</button>
          <button class="tab-button" data-tab="stock" type="button">${uiLabels.navigation.stock}</button>
          <button class="tab-button" data-tab="log" type="button">${uiLabels.navigation.log}</button>
        </div>
      </aside>

      <section class="content-stage">
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
                  <strong>${gameData.dailyShopIncome} ${uiLabels.overviewNotes.incomeValueSuffix}</strong>
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

        <section class="tab-panel panel" data-panel="quests" hidden>
          <div class="panel-head">
            <h2>${uiLabels.panels.questsTitle}</h2>
            <p>${uiLabels.panels.questsDescription}</p>
          </div>
          <div class="tasks-grid">
            <section class="panel inset-panel task-form-panel">
              <div class="panel-head">
                <h3>${uiLabels.panels.publishQuestTitle}</h3>
                <p>${uiLabels.panels.publishQuestDescription}</p>
              </div>
              <label class="field">
                <span>${uiLabels.form.templateType}</span>
                <select id="template-select"></select>
              </label>
              <p id="template-mode" class="hint"></p>
              <p id="template-description" class="hint"></p>
              <label class="field">
                <span id="reward-label">${uiLabels.form.reward}</span>
                <input id="reward-input" type="number" min="1" />
              </label>
              <label class="field quest-quantity-field">
                <span id="quantity-label">${uiLabels.form.quantity}</span>
                <input id="quantity-input" type="number" min="1" value="1" />
              </label>
              <p id="quantity-hint" class="hint quest-quantity-hint"></p>
              <p id="duration-hint" class="hint"></p>
              <button id="create-quest-btn" class="primary-button" type="button">${uiLabels.form.createQuest}</button>
            </section>

            <section class="panel inset-panel task-list-panel">
              <div class="panel-head">
                <h3>${uiLabels.panels.questListTitle}</h3>
                <p>${uiLabels.panels.questListDescription}</p>
              </div>
              <div class="quest-filter-row">
                <label class="field compact-field">
                  <span>${uiLabels.form.statusFilter}</span>
                  <select id="quest-status-filter"></select>
                </label>
                <label class="field compact-field">
                  <span>${uiLabels.form.natureFilter}</span>
                  <select id="quest-nature-filter"></select>
                </label>
              </div>
              <div id="quest-list" class="quest-list"></div>
            </section>
          </div>
        </section>

        <section class="tab-panel panel" data-panel="adventurers" hidden>
          <div class="panel-head">
            <h2>${uiLabels.panels.adventurersTitle}</h2>
            <p>${uiLabels.panels.adventurersDescription}</p>
          </div>
          <div class="adventurer-filter-row">
            <label class="field compact-field">
              <span>${uiLabels.form.adventurerLevelFilter}</span>
              <select id="adventurer-level-filter"></select>
            </label>
            <label class="field compact-field">
              <span>${uiLabels.form.adventurerStatusFilter}</span>
              <select id="adventurer-status-filter"></select>
            </label>
            <label class="field compact-field">
              <span>${uiLabels.form.adventurerPinnedFilter}</span>
              <select id="adventurer-pinned-filter"></select>
            </label>
          </div>
          <div id="adventurer-list" class="adventurer-list"></div>
        </section>

        <section class="tab-panel panel" data-panel="intel" hidden>
          <div class="panel-head">
            <h2>${uiLabels.panels.intelTitle}</h2>
            <p>${uiLabels.panels.intelDescription}</p>
          </div>
          <div id="intel-list" class="intel-board"></div>
        </section>

        <section class="tab-panel panel" data-panel="stock" hidden>
          <div class="panel-head">
            <h2>${uiLabels.panels.stockTitle}</h2>
            <p>${uiLabels.panels.stockDescription}</p>
          </div>
          <div id="stock-list" class="stock-list"></div>
        </section>

        <section class="tab-panel panel" data-panel="log" hidden>
          <div class="panel-head">
            <h2>${uiLabels.panels.logTitle}</h2>
            <p>${uiLabels.panels.logDescription}</p>
          </div>
          <div id="log-list" class="log-list"></div>
        </section>
      </section>

      <aside class="story-sidebar panel">
        <section class="story-rail">
          <div class="panel-head">
            <h2>${uiLabels.panels.latestStoriesTitle}</h2>
            <p>${uiLabels.panels.latestStoriesDescription}</p>
          </div>
          <div id="story-rail-list" class="log-list compact-list"></div>
        </section>
      </aside>
    </main>
  `;

  elements.dayDisplay = container.querySelector("#day-display");
  elements.moneyDisplay = container.querySelector("#money-display");
  elements.activeQuestDisplay = container.querySelector("#active-quest-display");
  elements.stockSummaryDisplay = container.querySelector("#stock-summary-display");
  elements.knownAdventurerDisplay = container.querySelector("#known-adventurer-display");
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

export function populateQuestTemplateOptions(gameData: GameData, elements: Elements): void {
  if (!elements.templateSelect) {
    return;
  }

  const previousValue = elements.templateSelect.value;
  elements.templateSelect.innerHTML = "";
  getVisibleQuestTemplates(gameData).forEach((template) => {
    const option = document.createElement("option");
    const isBlocked = isQuestTemplatePublicationBlocked(gameData, template.id);
    option.value = template.id;
    option.disabled = isBlocked;
    option.textContent = `${getQuestNatureText(template.nature)} · ${template.title}${template.followUpStageTag ? " · 后续" : ""} · ${getQuestTemplateFocusLabel(gameData, template)}${isBlocked ? " · 推进中" : ""}`;
    elements.templateSelect?.appendChild(option);
  });

  const options = Array.from(elements.templateSelect.options);
  const hasEnabledOption = options.some((option) => !option.disabled);
  if (!hasEnabledOption) {
    elements.templateSelect.selectedIndex = -1;
    return;
  }

  const previousOption = options.find((option) => option.value === previousValue);
  if (previousOption && !previousOption.disabled) {
    elements.templateSelect.value = previousValue;
    return;
  }

  const firstEnabledOption = options.find((option) => !option.disabled);
  if (firstEnabledOption) {
    elements.templateSelect.value = firstEnabledOption.value;
  }
}

export function populateQuestFilterOptions(gameData: GameData, elements: Elements): void {
  if (elements.questStatusFilterSelect) {
    elements.questStatusFilterSelect.innerHTML = "";
    getQuestStatusFilterOptions().forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      elements.questStatusFilterSelect?.appendChild(option);
    });
    elements.questStatusFilterSelect.value = gameData.questFilters.status;
  }

  if (elements.questNatureFilterSelect) {
    elements.questNatureFilterSelect.innerHTML = "";
    getQuestNatureFilterOptions().forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      elements.questNatureFilterSelect?.appendChild(option);
    });
    elements.questNatureFilterSelect.value = gameData.questFilters.nature;
  }
}

export function populateAdventurerFilterOptions(gameData: GameData, elements: Elements): void {
  if (elements.adventurerLevelFilterSelect) {
    elements.adventurerLevelFilterSelect.innerHTML = "";
    getAdventurerLevelFilterOptions().forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      elements.adventurerLevelFilterSelect?.appendChild(option);
    });
    elements.adventurerLevelFilterSelect.value = gameData.adventurerFilters.level;
  }

  if (elements.adventurerStatusFilterSelect) {
    elements.adventurerStatusFilterSelect.innerHTML = "";
    getAdventurerStatusFilterOptions().forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      elements.adventurerStatusFilterSelect?.appendChild(option);
    });
    elements.adventurerStatusFilterSelect.value = gameData.adventurerFilters.status;
  }

  if (elements.adventurerPinnedFilterSelect) {
    elements.adventurerPinnedFilterSelect.innerHTML = "";
    getAdventurerPinnedFilterOptions().forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      elements.adventurerPinnedFilterSelect?.appendChild(option);
    });
    elements.adventurerPinnedFilterSelect.value = gameData.adventurerFilters.pinned;
  }
}

export function syncQuestForm(gameData: GameData, elements: Elements): void {
  if (
    !elements.templateSelect ||
    !elements.rewardInput ||
    !elements.quantityInput ||
    !elements.durationHint ||
    !elements.templateDescription
  ) {
    return;
  }

  const templateId = elements.templateSelect.value;
  const template = gameData.questTemplates.find((item) => item.id === templateId);
  if (!template) {
    elements.templateDescription.textContent = "";
    elements.durationHint.textContent = "";
    if (elements.createQuestBtn) {
      elements.createQuestBtn.disabled = true;
    }
    return;
  }

  const isBlocked = isQuestTemplatePublicationBlocked(gameData, template.id);
  const publishMode = getQuestPublishMode(template);
  const templateMode = elements.container?.querySelector<HTMLParagraphElement>("#template-mode");
  const rewardLabel = elements.container?.querySelector<HTMLSpanElement>("#reward-label");
  const quantityField = elements.container?.querySelector<HTMLElement>(".quest-quantity-field") ?? null;
  const quantityHint = elements.container?.querySelector<HTMLParagraphElement>("#quantity-hint");

  const quantity = publishMode === "intel"
    ? 1
    : Math.max(1, Number.parseInt(elements.quantityInput.value || "1", 10));
  const recommendedReward = getRecommendedRewardForTemplate(gameData, templateId, quantity);
  const estimatedDays = getEstimatedDaysForTemplate(gameData, templateId, quantity);

  elements.quantityInput.value = String(quantity);
  elements.quantityInput.disabled = publishMode === "intel";
  elements.rewardInput.value = String(recommendedReward);
  if (templateMode) {
    templateMode.textContent = `${uiLabels.form.publishMode}：${getQuestPublishModeText(publishMode)}`;
  }
  if (rewardLabel) {
    rewardLabel.textContent = publishMode === "intel" ? uiLabels.form.intelReward : uiLabels.form.stockReward;
  }
  if (quantityField) {
    quantityField.classList.toggle("is-hidden", publishMode === "intel");
  }
  if (quantityHint) {
    quantityHint.classList.toggle("is-hidden", publishMode !== "intel");
    quantityHint.textContent = publishMode === "intel" ? getQuantityHint(publishMode) : "";
  }
  const summary = getQuestTemplateSummary(
    template.description,
    getQuestRiskText(template.risk),
    getQuestNatureText(template.nature)
  );
  const displaySummary = isBlocked ? getBlockedQuestTemplateSummary(summary) : summary;
  elements.templateDescription.textContent = template.designerNote
    ? `${displaySummary} ${getDesignerNoteText(template.designerNote)}`
    : displaySummary;
  elements.durationHint.textContent = getQuestFormHint(estimatedDays);
  if (elements.createQuestBtn) {
    elements.createQuestBtn.disabled = isBlocked;
  }
}

export function render(gameData: GameData, elements: Elements): void {
  populateQuestTemplateOptions(gameData, elements);
  syncQuestForm(gameData, elements);
  renderHeader(gameData, elements);
  renderTabs(gameData, elements);
  renderQuestLists(gameData, elements);
  renderAdventurers(gameData, elements);
  renderIntelBoard(gameData, elements);
  renderStock(gameData, elements);
  renderLogs(gameData, elements);
}

export function showNotification(message: string, type: NotificationType = "info"): void {
  const oldNotifications = document.querySelectorAll(".notification");
  oldNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.classList.add("visible");
  });

  window.setTimeout(() => {
    notification.classList.remove("visible");
    window.setTimeout(() => notification.remove(), UI_TUNING.notificationExitDelayMs);
  }, UI_TUNING.notificationVisibleDurationMs);
}

function renderHeader(gameData: GameData, elements: Elements): void {
  const summary = getHeaderSummaryViewModel(gameData);

  if (elements.dayDisplay) {
    elements.dayDisplay.textContent = summary.dayText;
  }

  if (elements.moneyDisplay) {
    elements.moneyDisplay.textContent = summary.moneyText;
  }

  if (elements.activeQuestDisplay) {
    elements.activeQuestDisplay.textContent = summary.activeQuestText;
  }

  if (elements.stockSummaryDisplay) {
    elements.stockSummaryDisplay.textContent = summary.stockTotalText;
  }

  if (elements.knownAdventurerDisplay) {
    elements.knownAdventurerDisplay.textContent = summary.knownAdventurerText;
  }
}

function renderTabs(gameData: GameData, elements: Elements): void {
  if (!elements.container) {
    return;
  }

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === gameData.activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const panels = Array.from(elements.container.querySelectorAll<HTMLElement>(".tab-panel"));
  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === gameData.activeTab;
    panel.hidden = !isActive;
  });
}

function renderQuestLists(gameData: GameData, elements: Elements): void {
  renderQuestCollection(gameData, elements.questList, getFilteredQuests(gameData));
  renderQuestCollection(
    gameData,
    elements.overviewQuestList,
    gameData.player.quests.slice(0, UI_TUNING.overviewQuestCount),
    uiText.emptyOverviewQuests
  );
}

function renderQuestCollection(
  gameData: GameData,
  target: HTMLDivElement | null,
  quests: Quest[],
  emptyText = uiText.emptyQuestList
): void {
  if (!target) {
    return;
  }

  target.innerHTML = "";

  if (quests.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  quests.forEach((quest) => {
    const questElement = document.createElement("article");
    questElement.className = `quest-card ${quest.status}`;
    questElement.innerHTML = buildQuestCardMarkup(getQuestCardViewModel(gameData, quest));
    target.appendChild(questElement);
  });
}

function buildQuestCardMarkup(quest: QuestCardViewModel): string {
  return `
    <div class="quest-head">
      <strong>${uiLabels.questCard.prefix} ${quest.displayId}</strong>
      <span class="status-pill ${quest.statusClass}">${quest.statusText}</span>
    </div>
    <p class="quest-body"><strong>${quest.titleText}</strong> <span class="log-badge quest">${quest.badgeText}</span></p>
    <p class="quest-body">${quest.descriptionText}</p>
    <div class="quest-meta">
      <span>${quest.bodyText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.riskText}</span>
      <span>${quest.natureText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.rewardText}</span>
      <span>${quest.durationText}</span>
    </div>
    <div class="quest-meta">
      <span>${quest.createdDayText}</span>
      <span>${quest.progressText}</span>
    </div>
    ${quest.adventurerText ? `<div class="adventurer-meta">${quest.adventurerText}</div>` : ""}
    ${quest.resultText ? `<div class="adventurer-meta">${quest.resultText}</div>` : ""}
    ${quest.resultReasonText ? `<div class="adventurer-meta">${quest.resultReasonText}</div>` : ""}
  `;
}

function getFilteredQuests(gameData: GameData): Quest[] {
  return gameData.player.quests.filter((quest) => {
    const matchStatus = gameData.questFilters.status === "all" || quest.status === gameData.questFilters.status;
    const matchNature = gameData.questFilters.nature === "all" || quest.nature === gameData.questFilters.nature;
    return matchStatus && matchNature;
  });
}

function getVisibleQuestTemplates(gameData: GameData) {
  return gameData.questTemplates.filter((template) => {
    const hasResolvedSameTemplate = gameData.player.quests.some((quest) => {
      return quest.templateId === template.id && quest.completedDay !== null;
    });

    if ((template.resolutionVisibility ?? (template.followUpStageTag ? "hide" : "stay")) === "hide" && hasResolvedSameTemplate) {
      return false;
    }

    return isQuestTemplateUnlocked(gameData, template);
  });
}

function renderStock(gameData: GameData, elements: Elements): void {
  if (!elements.stockList) {
    return;
  }

  elements.stockList.innerHTML = "";

  gameData.resources.forEach((resource) => {
    const item = document.createElement("div");
    item.className = "stock-item";
    const stockItem = getStockItemViewModel(gameData, resource.id, gameData.player.stock[resource.id] ?? 0);
    item.innerHTML = `<span>${stockItem.label}</span><strong>${stockItem.amount}</strong>`;
    elements.stockList?.appendChild(item);
  });
}

function renderIntelBoard(gameData: GameData, elements: Elements): void {
  if (!elements.intelList) {
    return;
  }

  const leadMarkup = gameData.player.leads.length > 0
    ? gameData.player.leads.map((record) => buildIntelItemMarkup(getIntelItemViewModel(gameData, record))).join("")
    : `<p class="empty-state">${uiLabels.intelBoard.emptyLeads}</p>`;
  const discoveryMarkup = gameData.player.discoveries.length > 0
    ? gameData.player.discoveries.map((record) => buildIntelItemMarkup(getIntelItemViewModel(gameData, record))).join("")
    : `<p class="empty-state">${uiLabels.intelBoard.emptyDiscoveries}</p>`;

  elements.intelList.innerHTML = `
    <section class="panel inset-panel intel-section">
      <div class="panel-head">
        <h3>${uiLabels.intelBoard.leadsTitle}</h3>
        <p>${uiLabels.intelBoard.leadsDescription}</p>
      </div>
      <div class="log-list compact-list">${leadMarkup}</div>
    </section>
    <section class="panel inset-panel intel-section">
      <div class="panel-head">
        <h3>${uiLabels.intelBoard.discoveriesTitle}</h3>
        <p>${uiLabels.intelBoard.discoveriesDescription}</p>
      </div>
      <div class="log-list compact-list">${discoveryMarkup}</div>
    </section>
  `;
}

function renderAdventurers(gameData: GameData, elements: Elements): void {
  if (!elements.adventurerList) {
    return;
  }

  elements.adventurerList.innerHTML = "";
  const knownAdventurers = getFilteredAdventurers(gameData);

  if (knownAdventurers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = uiText.emptyAdventurers;
    elements.adventurerList.appendChild(empty);
    return;
  }

  const pinnedAdventurers = knownAdventurers.filter((adventurer) => gameData.pinnedAdventurerIds.includes(adventurer.id));
  const unpinnedAdventurers = knownAdventurers.filter((adventurer) => !gameData.pinnedAdventurerIds.includes(adventurer.id));

  if (gameData.adventurerFilters.pinned === "pinned") {
    if (pinnedAdventurers.length > 0) {
      elements.adventurerList.appendChild(
        buildAdventurerSection(gameData, uiLabels.adventurerCard.pinnedSection, pinnedAdventurers)
      );
    }
    return;
  }

  if (gameData.adventurerFilters.pinned === "unpinned") {
    if (unpinnedAdventurers.length > 0) {
      elements.adventurerList.appendChild(
        buildAdventurerSection(gameData, uiLabels.adventurerCard.othersSection, unpinnedAdventurers)
      );
    }
    return;
  }

  if (pinnedAdventurers.length > 0) {
    elements.adventurerList.appendChild(
      buildAdventurerSection(gameData, uiLabels.adventurerCard.pinnedSection, pinnedAdventurers)
    );
  }

  if (unpinnedAdventurers.length > 0) {
    elements.adventurerList.appendChild(
      buildAdventurerSection(gameData, uiLabels.adventurerCard.othersSection, unpinnedAdventurers)
    );
  }
}

function renderLogs(gameData: GameData, elements: Elements): void {
  renderLogCollection(elements.logList, gameData.dayLog, uiText.emptyLogs);
  renderLogCollection(elements.storyRailList, getLatestDayEntries(gameData), uiText.emptyLatestStories);
}

function renderLogCollection(target: HTMLDivElement | null, entries: StoryEntry[], emptyText: string): void {
  if (!target) {
    return;
  }

  target.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = `log-entry ${entry.tone}`;
    item.innerHTML = buildLogEntryMarkup(entry);
    target.appendChild(item);
  });
}

function buildLogEntryMarkup(entry: StoryEntry): string {
  const variantClass = getStoryVariantClass(entry.badge);
  return `
    ${entry.badge ? `<span class="log-badge ${entry.tone} ${variantClass}">${entry.badge}</span>` : ""}
    <span class="log-text">${entry.text}</span>
  `;
}

function getStoryVariantClass(badge: StoryEntry["badge"]): string {
  switch (badge) {
    case "完成":
      return "story-complete";
    case "失手":
      return "story-failed";
    case "线索":
      return "story-lead";
    case "发现":
      return "story-discovery";
    case "后续":
      return "story-follow-up";
    case "出发":
      return "story-started";
    case "推进":
      return "story-progress";
    case "收益":
      return "story-income";
    default:
      return "";
  }
}

function buildIntelItemMarkup(item: ReturnType<typeof getIntelItemViewModel>): string {
  return `
    <article class="intel-item">
      <div class="quest-head">
        <span class="log-badge reward">${item.badgeText}</span>
        <span class="intel-status ${item.statusClass}">${uiLabels.intelBoard.status}：${item.statusText}</span>
        <span class="story-day">${item.dayText}</span>
      </div>
      <strong class="mini-title">${item.titleText}</strong>
      <p class="quest-body">${item.summaryText}</p>
      ${item.lineText ? `<div class="adventurer-meta">${item.lineText}</div>` : ""}
      <div class="adventurer-meta">${item.sourceText}</div>
      <div class="adventurer-meta">${item.methodText}</div>
    </article>
  `;
}

function buildAdventurerMarkup(adventurer: AdventurerCardViewModel): string {
  if (adventurer.rumorText) {
    return `
      <div class="adventurer-head">
        <strong>${adventurer.name}</strong>
        <div class="adventurer-head-actions">
          <button class="ghost-button pin-toggle" type="button" data-adventurer-id="${adventurer.id}">${adventurer.pinActionText}</button>
          <span class="status-pill ${adventurer.levelClass}">${adventurer.levelText}</span>
        </div>
      </div>
      <p class="quest-body">${adventurer.title}</p>
      <div class="adventurer-meta">${adventurer.rumorText}</div>
    `;
  }

  return `
    <div class="adventurer-head">
      <strong>${adventurer.name}</strong>
      <div class="adventurer-head-actions">
        <button class="ghost-button pin-toggle" type="button" data-adventurer-id="${adventurer.id}">${adventurer.pinActionText}</button>
        <span class="status-pill ${adventurer.levelClass}">${adventurer.levelText}</span>
      </div>
    </div>
    <p class="quest-body">${adventurer.title}</p>
    ${adventurer.impressionText ? `<div class="adventurer-meta">${adventurer.impressionText}</div>` : ""}
    ${adventurer.preferenceText ? `<div class="adventurer-meta">${adventurer.preferenceText}</div>` : ""}
    ${adventurer.personalityText ? `<div class="adventurer-meta">${adventurer.personalityText}</div>` : ""}
    ${adventurer.currentStatusText ? `<div class="adventurer-meta">${adventurer.currentStatusText}</div>` : ""}
    ${adventurer.lastCompletedText ? `<div class="adventurer-meta">${adventurer.lastCompletedText}</div>` : ""}
    ${adventurer.motiveText ? `<div class="adventurer-meta">${adventurer.motiveText}</div>` : ""}
  `;
}

function getFilteredAdventurers(gameData: GameData) {
  return getKnownAdventurers(gameData).filter((adventurer) => {
    const matchLevel = gameData.adventurerFilters.level === "all" || adventurer.knownLevel === gameData.adventurerFilters.level;
    const isAway = adventurer.currentQuestId !== null;
    const matchStatus = gameData.adventurerFilters.status === "all"
      || (gameData.adventurerFilters.status === "away" && isAway)
      || (gameData.adventurerFilters.status === "idle" && !isAway);
    const isPinned = gameData.pinnedAdventurerIds.includes(adventurer.id);
    const matchPinned = gameData.adventurerFilters.pinned === "all"
      || (gameData.adventurerFilters.pinned === "pinned" && isPinned)
      || (gameData.adventurerFilters.pinned === "unpinned" && !isPinned);

    return matchLevel && matchStatus && matchPinned;
  });
}

function buildAdventurerSection(gameData: GameData, title: string, adventurers: ReturnType<typeof getKnownAdventurers>) {
  const section = document.createElement("section");
  section.className = "adventurer-section";
  section.innerHTML = `<h3 class="mini-title">${title}</h3>`;

  const list = document.createElement("div");
  list.className = "adventurer-list";
  adventurers.forEach((adventurer) => {
    const card = document.createElement("article");
    card.className = "adventurer-card";
    card.innerHTML = buildAdventurerMarkup(getAdventurerCardViewModel(gameData, adventurer));
    list.appendChild(card);
  });
  section.appendChild(list);

  return section;
}
