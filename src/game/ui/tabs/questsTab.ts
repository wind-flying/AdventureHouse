import type {Elements, GameData, Quest} from "../../core/types";
import {getQuestNatureFilterOptions, getQuestStatusFilterOptions} from "../../questDefinitions";
import {
  getEstimatedDaysForTemplate,
  getQuestPublishMode,
  getRecommendedRewardForTemplate,
  isQuestTemplatePublicationBlocked,
  isStockQuestDurationCapped
} from "../../systems/quests/taskBoard";
import {getRecommendedTrailRationQuantity} from "../../systems/adventurers/dailyNeeds";
import {
  estimateQuestTrailRationCost,
  getDefaultStockQuestQuantity,
  getMarketBuyTotal,
  getMarketStockAvailability,
  getMinimumLaborReward,
  getQuestEffectiveUnitCost,
  getQuestMarketSavingsPercent,
  getRecommendedQuestReward,
  getStockTargetUnitCostRatio
} from "../../systems/quests/questEconomy";
import {getStockCargoValuePerDay} from "../../systems/quests/stockQuestProfile";
import {getBuyPrice} from "../../systems/economy/marketPricing";
import {getResourceName} from "../resourceDisplay";
import {getItemStackAmount} from "../../systems/inventory";
import {getStackSatietySummaryForRef} from "../../text/satietyText";
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
import {sortQuestsForDisplay} from "../questSorting";
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
          <label class="field quest-quantity-field"><span id="quantity-label">${uiLabels.form.quantity}</span><input id="quantity-input" type="number" min="1" /></label>
          <p id="quantity-hint" class="hint quest-quantity-hint"></p>
          <p id="duration-hint" class="hint"></p>
          <p id="ration-hint" class="hint"></p>
          <p id="economy-hint" class="hint"></p>
          <label class="field quest-provision-field">
            <input id="provision-rations-checkbox" class="game-toggle-input" type="checkbox" />
            <span class="game-toggle-switch" aria-hidden="true"></span>
            <span class="game-toggle-text">店主供粮</span>
          </label>
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
    option.textContent = `${template.shortTitle ?? template.title}${isBlocked ? " · 推进中" : ""}`;
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
  const lastTemplateId = elements.container?.dataset.currentQuestTemplateId ?? "";
  const templateChanged = lastTemplateId !== template.id;
  if (elements.container) {
    elements.container.dataset.currentQuestTemplateId = template.id;
  }

  let quantity = publishMode === "intel"
    ? 1
    : Math.max(1, Number.parseInt(elements.quantityInput.value || "1", 10));
  if (publishMode === "stock" && templateChanged) {
    quantity = getDefaultStockQuestQuantity(gameData, template);
  }

  elements.quantityInput.value = String(quantity);
  elements.quantityInput.disabled = publishMode === "intel";
  elements.rewardInput.value = String(getRecommendedRewardForTemplate(gameData, template.id, quantity));
  if (templateMode) templateMode.textContent = `${uiLabels.form.publishMode}：${getQuestPublishModeText(publishMode)}`;
  if (rewardLabel) rewardLabel.textContent = publishMode === "intel" ? uiLabels.form.intelReward : uiLabels.form.stockReward;
  if (quantityField) quantityField.classList.toggle("is-hidden", publishMode === "intel");
  if (quantityHint) {
    quantityHint.classList.toggle("is-hidden", publishMode === "intel");
    quantityHint.textContent = publishMode === "stock" ? getQuantityHint(publishMode) : "";
  }

  const summary = getQuestTemplateSummary(
    template.description,
    getQuestRiskText(template.risk),
    getQuestNatureText(template.nature)
  );
  elements.templateDescription.textContent = isBlocked ? getBlockedQuestTemplateSummary(summary) : summary;
  const estimatedDays = getEstimatedDaysForTemplate(gameData, template.id, quantity);
  elements.durationHint.textContent = getQuestFormHint(estimatedDays, publishMode === "stock" && isStockQuestDurationCapped(gameData, template.id, quantity)
    ? {
      stockDurationCapped: true,
      stockDurationCap: gameData.questEconomyConfig.maxDaysPerStockQuest
    }
    : undefined);
  syncRationProvisionHint(gameData, elements, template.id, quantity);
  syncQuestEconomyHint(gameData, elements, template, quantity, publishMode);
  if (elements.createQuestBtn) elements.createQuestBtn.disabled = isBlocked;
}

export function refreshQuestEconomyHint(gameData: GameData, elements: Elements): void {
  if (!elements.templateSelect) {
    return;
  }

  const template = gameData.questTemplates.find((item) => item.id === elements.templateSelect?.value);
  if (!template) {
    return;
  }

  const publishMode = getQuestPublishMode(template);
  const quantity = publishMode === "intel"
    ? 1
    : Math.max(1, Number.parseInt(elements.quantityInput?.value || "1", 10));
  syncQuestEconomyHint(gameData, elements, template, quantity, publishMode);
}

function syncRationProvisionHint(
  gameData: GameData,
  elements: Elements,
  templateId: string,
  quantity: number
): void {
  const rationHint = elements.rationHint;
  const provisionCheckbox = elements.provisionRationsCheckbox;
  const template = gameData.questTemplates.find((item) => item.id === templateId);
  if (!rationHint || !template) {
    return;
  }

  const estimatedDays = getEstimatedDaysForTemplate(gameData, templateId, quantity);
  const recommendation = getRecommendedTrailRationQuantity(gameData, {
    totalDays: estimatedDays,
    risk: template.risk
  });
  const item = gameData.itemDefinitions.find((candidate) => candidate.id === recommendation.itemId);
  const available = getItemStackAmount(gameData, recommendation.itemId);
  const satietySummary = getStackSatietySummaryForRef(
    gameData,
    "item",
    recommendation.itemId,
    recommendation.quantity
  );
  const trailCost = estimateQuestTrailRationCost(gameData, {
    totalDays: estimatedDays,
    risk: template.risk,
    provisionRations: null
  });
  const minReward = getMinimumLaborReward(gameData, template, quantity);
  const satietyClause = satietySummary ? `，${satietySummary}` : "";
  rationHint.textContent = `推荐路粮：${recommendation.quantity} 份 ${item?.name ?? recommendation.itemId}（库存 ${available}${satietyClause}）· 预估路粮成本约 ${trailCost} 钱 · 建议最低劳务酬金 ${minReward} 钱`;

  if (provisionCheckbox) {
    provisionCheckbox.disabled = available < recommendation.quantity;
    if (provisionCheckbox.disabled) {
      provisionCheckbox.checked = false;
    }
  }
}

function syncQuestEconomyHint(
  gameData: GameData,
  elements: Elements,
  template: GameData["questTemplates"][number],
  quantity: number,
  publishMode: ReturnType<typeof getQuestPublishMode>
): void {
  const economyHint = elements.container?.querySelector<HTMLParagraphElement>("#economy-hint");
  if (!economyHint) {
    return;
  }

  if (publishMode !== "stock" || !template.resource) {
    economyHint.textContent = "";
    economyHint.classList.add("is-hidden");
    return;
  }

  economyHint.classList.remove("is-hidden");
  const resourceLabel = getResourceName(gameData, template.resource);
  const reward = Math.max(1, Number.parseInt(elements.rewardInput?.value || "1", 10));
  const recommendedReward = getRecommendedQuestReward(gameData, template, quantity);
  const minLabor = getMinimumLaborReward(gameData, template, quantity);
  const buyPrice = getBuyPrice(gameData, "resource", template.resource);
  const marketBuyTotal = getMarketBuyTotal(gameData, template.resource, quantity);
  const estimatedDays = getEstimatedDaysForTemplate(gameData, template.id, quantity);
  const effectiveUnitCost = getQuestEffectiveUnitCost(reward, quantity);
  const recommendedSavings = getQuestMarketSavingsPercent(recommendedReward, marketBuyTotal);
  const targetRatio = getStockTargetUnitCostRatio(gameData, template, quantity);
  const cargoPerDay = getStockCargoValuePerDay(quantity, buyPrice, estimatedDays);
  const {available: marketAvailable, stock: marketStock} = getMarketStockAvailability(
    gameData,
    template.resource,
    quantity
  );

  const lines = [
    `许可收获约 ${quantity} 单位${resourceLabel}运回店内（非市场现货，成功时入账仓库）。`,
    `预估 ${estimatedDays} 天完成，运量约 ${cargoPerDay} 钱/天；劳务酬金建议 ${minLabor}～${recommendedReward} 钱（含路费余量）；市场直购约 ${marketBuyTotal} 钱（${buyPrice} 钱/单位，已流通存货）。`
  ];

  if (recommendedSavings !== null && recommendedSavings > 0) {
    lines.push(`按建议上限酬金，较市场直购约省 ${recommendedSavings}%（目标有效单价 ${Math.round(targetRatio * 100)}% 市价）。`);
  } else if (recommendedSavings !== null && recommendedSavings < 0) {
    lines.push(`按建议上限酬金，较市场直购约贵 ${Math.abs(recommendedSavings)}%（目标有效单价 ${Math.round(targetRatio * 100)}% 市价）。`);
  } else if (recommendedSavings === 0) {
    lines.push(`按建议上限酬金与市场直购大致持平（目标有效单价 ${Math.round(targetRatio * 100)}% 市价）。`);
  }

  if (!marketAvailable) {
    lines.push(`市场当前仅 ${marketStock} 单位现货，委托是补仓库的主路径。`);
  }

  if (reward < minLabor) {
    lines.push("酬金低于建议劳务底线，冒险者可能不愿接取。");
  } else if (effectiveUnitCost >= buyPrice) {
    lines.push("有效单价不低于市场买入价，不如直接买现货。");
  } else if (reward > marketBuyTotal) {
    lines.push("总酬金高于市场直购，委托不划算。");
  }

  economyHint.textContent = lines.join(" ");
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
  const filteredQuests = gameData.player.quests.filter((quest) => {
    const matchStatus = gameData.questFilters.status === "all" || quest.status === gameData.questFilters.status;
    const matchNature = gameData.questFilters.nature === "all" || quest.nature === gameData.questFilters.nature;
    return matchStatus && matchNature;
  });
  return sortQuestsForDisplay(filteredQuests, gameData.day);
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
