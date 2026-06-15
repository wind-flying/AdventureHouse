import type {Elements, GameData, Quest} from "../../core/types";
import {getQuestNatureFilterOptions, getQuestStatusFilterOptions} from "../../questDefinitions";
import {
  getEstimatedDaysForTemplate,
  getQuestPublishMode,
  getRecommendedRewardForTemplate,
  isQuestTemplatePublicationBlocked
} from "../../systems/quests/taskBoard";
import {isQuestTemplateUnlocked} from "../../systems/quests/questUnlocks";
import {uiLabels} from "../../text/uiLabels";
import {getQuestNatureText, getQuestRiskText} from "../../text/statusText";
import {
  getBlockedQuestTemplateSummary,
  getQuestFormHint,
  getQuestPublishModeText,
  getQuantityHint,
  getQuestTemplateSummary,
  uiText
} from "../../text/uiText";
import {getQuestTemplateFocusLabel} from "../resourceDisplay";
import {renderQuestCollection} from "../shared/questCards";

export function getQuestsTabMarkup(): string {
  return `
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
          <label class="field"><span>${uiLabels.form.templateType}</span><select id="template-select"></select></label>
          <p id="template-mode" class="hint"></p>
          <p id="template-description" class="hint"></p>
          <label class="field"><span id="reward-label">${uiLabels.form.reward}</span><input id="reward-input" type="number" min="1" /></label>
          <label class="field quest-quantity-field"><span id="quantity-label">${uiLabels.form.quantity}</span><input id="quantity-input" type="number" min="1" value="1" /></label>
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
            <label class="field compact-field"><span>${uiLabels.form.statusFilter}</span><select id="quest-status-filter"></select></label>
            <label class="field compact-field"><span>${uiLabels.form.natureFilter}</span><select id="quest-nature-filter"></select></label>
          </div>
          <div id="quest-list" class="quest-list"></div>
        </section>
      </div>
    </section>
  `;
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
    option.textContent = `${getQuestNatureText(template.nature)} · ${template.title} · ${getQuestTemplateFocusLabel(gameData, template)}${isBlocked ? " · 推进中" : ""}`;
    elements.templateSelect?.appendChild(option);
  });

  const options = Array.from(elements.templateSelect.options);
  const previousOption = options.find((option) => option.value === previousValue);
  const firstEnabledOption = options.find((option) => !option.disabled);
  if (!firstEnabledOption) {
    elements.templateSelect.selectedIndex = -1;
  } else if (previousOption && !previousOption.disabled) {
    elements.templateSelect.value = previousValue;
  } else {
    elements.templateSelect.value = firstEnabledOption.value;
  }
}

export function populateQuestFilterOptions(gameData: GameData, elements: Elements): void {
  populateSelect(elements.questStatusFilterSelect, getQuestStatusFilterOptions(), gameData.questFilters.status);
  populateSelect(elements.questNatureFilterSelect, getQuestNatureFilterOptions(), gameData.questFilters.nature);
}

export function syncQuestForm(gameData: GameData, elements: Elements): void {
  if (!elements.templateSelect || !elements.rewardInput || !elements.quantityInput
    || !elements.durationHint || !elements.templateDescription) {
    return;
  }

  const template = gameData.questTemplates.find((item) => item.id === elements.templateSelect?.value);
  if (!template) {
    elements.templateDescription.textContent = "";
    elements.durationHint.textContent = "";
    if (elements.createQuestBtn) elements.createQuestBtn.disabled = true;
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

  elements.quantityInput.value = String(quantity);
  elements.quantityInput.disabled = publishMode === "intel";
  elements.rewardInput.value = String(getRecommendedRewardForTemplate(gameData, template.id, quantity));
  if (templateMode) templateMode.textContent = `${uiLabels.form.publishMode}：${getQuestPublishModeText(publishMode)}`;
  if (rewardLabel) rewardLabel.textContent = publishMode === "intel" ? uiLabels.form.intelReward : uiLabels.form.stockReward;
  if (quantityField) quantityField.classList.toggle("is-hidden", publishMode === "intel");
  if (quantityHint) {
    quantityHint.classList.toggle("is-hidden", publishMode !== "intel");
    quantityHint.textContent = publishMode === "intel" ? getQuantityHint(publishMode) : "";
  }

  const summary = getQuestTemplateSummary(
    template.description,
    getQuestRiskText(template.risk),
    getQuestNatureText(template.nature)
  );
  elements.templateDescription.textContent = isBlocked ? getBlockedQuestTemplateSummary(summary) : summary;
  elements.durationHint.textContent = getQuestFormHint(getEstimatedDaysForTemplate(gameData, template.id, quantity));
  if (elements.createQuestBtn) elements.createQuestBtn.disabled = isBlocked;
}

export function renderQuestsTab(gameData: GameData, elements: Elements): void {
  renderQuestCollection(gameData, elements.questList, getFilteredQuests(gameData), uiText.emptyQuestList);
}

function populateSelect(
  select: HTMLSelectElement | null,
  options: Array<{value: string; label: string}>,
  value: string
): void {
  if (!select) {
    return;
  }

  select.innerHTML = "";
  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  });
  select.value = value;
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
    const hasHiddenOutcome = gameData.player.quests.some((quest) => {
      if (quest.templateId !== template.id || quest.completedDay === null || !quest.result) {
        return false;
      }
      return getQuestTemplateOutcomeVisibility(template, quest.result.outcome) === "hide";
    });
    return !hasHiddenOutcome && isQuestTemplateUnlocked(gameData, template);
  });
}

function getQuestTemplateOutcomeVisibility(
  template: GameData["questTemplates"][number],
  outcome: "success" | "failure"
) {
  return outcome === "success"
    ? template.successVisibility ?? "stay"
    : template.failureVisibility ?? "stay";
}
