import type {
  Adventurer,
  AdventurerCarriedItem,
  AdventurerPersonalityAxis,
  Elements,
  EquipmentInstance,
  EquipmentSlot,
  GameData
} from "../core/types";
import {saveGameData} from "../save";
import {
  getEquipmentPrimaryLabel,
  getEquipmentTooltipContent,
  getRichTextVisibleLength,
  isRichTextWithinVisibleLimit,
  renderEquipmentNameButton,
  RICH_TEXT_MAX_VISIBLE_LENGTH
} from "./equipmentDisplay";
import {renderRichTextToHtml} from "../text/richText";
import {loadoutDialogueTemplates} from "../text/loadoutText";
import {uiLabels} from "../text/uiLabels";

const LOADOUT_SLOTS: EquipmentSlot[] = ["helmet", "weapon", "shield", "armor", "legArmor", "boots", "accessory", "tool"];

const PAPERDOLL_LINKS: Record<EquipmentSlot, {from: {x: number; y: number}; to: {x: number; y: number}}> = {
  helmet: {from: {x: 210, y: 92}, to: {x: 210, y: 108}},
  weapon: {from: {x: 112, y: 152}, to: {x: 170, y: 228}},
  shield: {from: {x: 308, y: 152}, to: {x: 250, y: 228}},
  armor: {from: {x: 112, y: 250}, to: {x: 188, y: 205}},
  legArmor: {from: {x: 308, y: 250}, to: {x: 226, y: 292}},
  boots: {from: {x: 210, y: 390}, to: {x: 210, y: 330}},
  accessory: {from: {x: 308, y: 346}, to: {x: 235, y: 215}},
  tool: {from: {x: 112, y: 346}, to: {x: 170, y: 215}}
};

let activeLoadoutAdventurerId: string | null = null;
let pendingRenameInstanceId: string | null = null;

export function getLoadoutMarkup(): string {
  return `
    <div id="loadout-modal" class="loadout-overlay" hidden>
      <section class="loadout-dialog" role="dialog" aria-modal="true" aria-labelledby="loadout-dialog-title">
        <header class="loadout-header">
          <h2 id="loadout-dialog-title">${uiLabels.loadout.title}</h2>
        </header>
        <div id="loadout-content" class="loadout-content"></div>
        <footer class="loadout-footer">
          <button id="loadout-close-btn" class="secondary-button" type="button">${uiLabels.loadout.close}</button>
        </footer>
        <div id="equip-rename-layer" class="equip-rename-layer" hidden>
          <form id="equip-rename-form" class="equip-rename-form">
            <h3 id="equip-rename-title">${uiLabels.loadout.renameTitle}</h3>
            <p id="equip-rename-description" class="equip-rename-description">${uiLabels.loadout.renameDescription}</p>
            <p class="equip-rename-format-help">${uiLabels.loadout.renameFormatHelp}</p>
            <label class="equip-rename-field">
              <span id="equip-rename-label"></span>
              <input id="equip-rename-input" class="equip-rename-input" maxlength="96" autocomplete="off" />
              <span id="equip-rename-counter" class="equip-rename-counter"></span>
            </label>
            <div id="equip-rename-preview" class="equip-rename-preview" aria-live="polite"></div>
            <div class="equip-rename-actions">
              <button id="equip-rename-cancel-btn" class="secondary-button" type="button">${uiLabels.loadout.renameCancel}</button>
              <button class="primary-button" type="submit">${uiLabels.loadout.renameSave}</button>
            </div>
          </form>
        </div>
        <div id="equip-tooltip" class="equip-tooltip" hidden role="tooltip"></div>
      </section>
    </div>
  `;
}

export function ensureLoadoutElements(container: HTMLElement, elements: Elements): void {
  if (!container.querySelector("#loadout-modal")) {
    container.insertAdjacentHTML("beforeend", getLoadoutMarkup());
  }

  elements.loadoutModal = container.querySelector("#loadout-modal");
  elements.loadoutContent = container.querySelector("#loadout-content");
  elements.loadoutCloseBtn = container.querySelector("#loadout-close-btn");
}

export function openLoadoutDialog(gameData: GameData, elements: Elements, adventurerId: string): void {
  if (elements.container) {
    ensureLoadoutElements(elements.container, elements);
  }

  activeLoadoutAdventurerId = adventurerId;
  closeEquipmentRenameLayer(elements);
  renderLoadoutDialog(gameData, elements, adventurerId);
  if (elements.loadoutModal) {
    elements.loadoutModal.hidden = false;
  }
}

export function dismissLoadoutOverlay(elements: Elements): void {
  const layer = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-layer");
  if (layer && !layer.hidden) {
    closeEquipmentRenameLayer(elements);
    return;
  }

  closeLoadoutDialog(elements);
}

export function closeLoadoutDialog(elements: Elements): void {
  activeLoadoutAdventurerId = null;
  pendingRenameInstanceId = null;
  closeEquipmentRenameLayer(elements);
  if (elements.loadoutModal) {
    elements.loadoutModal.hidden = true;
  }
  if (elements.loadoutContent) {
    elements.loadoutContent.innerHTML = "";
  }
}

export function bindLoadoutDialogEvents(gameData: GameData, elements: Elements): void {
  elements.loadoutCloseBtn?.addEventListener("click", () => {
    dismissLoadoutOverlay(elements);
  });
  elements.loadoutModal?.addEventListener("click", (event) => {
    if (event.target === elements.loadoutModal) {
      dismissLoadoutOverlay(elements);
    }
  });
  elements.loadoutContent?.addEventListener("click", (event) => {
    const origin = getClickElement(event);
    const renameButton = origin?.closest<HTMLButtonElement>(".equip-name[data-equipment-instance-id]");
    const instanceId = renameButton?.dataset.equipmentInstanceId;
    if (!renameButton || !instanceId || !activeLoadoutAdventurerId) {
      return;
    }

    event.preventDefault();
    openEquipmentRenameLayer(gameData, elements, instanceId);
  });

  const renameForm = elements.loadoutModal?.querySelector<HTMLFormElement>("#equip-rename-form");
  renameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitEquipmentRename(gameData, elements);
  });
  elements.loadoutModal?.querySelector("#equip-rename-cancel-btn")?.addEventListener("click", () => {
    closeEquipmentRenameLayer(elements);
  });
  elements.loadoutModal?.querySelector("#equip-rename-layer")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeEquipmentRenameLayer(elements);
    }
  });
  elements.loadoutModal?.querySelector("#equip-rename-input")?.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    updateEquipmentRenamePreview(elements, input.value);
  });
  elements.loadoutContent?.addEventListener("mouseover", (event) => {
    const origin = getClickElement(event);
    const nameButton = origin?.closest<HTMLButtonElement>(".equip-name[data-equipment-instance-id]");
    if (!nameButton?.dataset.equipmentInstanceId) {
      hideEquipmentTooltip(elements);
      return;
    }

    showEquipmentTooltip(gameData, elements, nameButton, event);
  });
  elements.loadoutContent?.addEventListener("mousemove", (event) => {
    const tooltip = elements.loadoutModal?.querySelector<HTMLElement>("#equip-tooltip");
    if (!tooltip || tooltip.hidden) {
      return;
    }

    positionEquipmentTooltip(tooltip, event);
  });
  elements.loadoutContent?.addEventListener("mouseleave", () => {
    hideEquipmentTooltip(elements);
  });
}

function renderLoadoutDialog(gameData: GameData, elements: Elements, adventurerId: string): void {
  if (!elements.loadoutContent) {
    return;
  }

  const adventurer = gameData.adventurers.find((candidate) => candidate.id === adventurerId);
  if (!adventurer) {
    elements.loadoutContent.innerHTML = `<p class="empty-state">${uiLabels.loadout.unknownAdventurer}</p>`;
    return;
  }

  const equipment = getAdventurerEquipment(gameData, adventurer);
  const carriedItems = getCarriedItems(gameData, adventurer);
  const canSeeMoney = canSeeCarriedMoney(adventurer);
  const canSeeItems = canSeeAllCarriedItems(adventurer);
  const filledSlots = LOADOUT_SLOTS.filter((slot) => equipment.has(slot));
  elements.loadoutContent.innerHTML = `
    <div class="loadout-body">
      <section class="loadout-paperdoll" aria-label="${uiLabels.loadout.equipmentTitle}">
        <h3>${uiLabels.loadout.equipmentTitle}</h3>
        <div class="paperdoll-grid">
          ${renderPaperdollLinks(filledSlots)}
          ${renderPaperdollFigure()}
          ${LOADOUT_SLOTS.map((slot) => buildEquipmentSlotMarkup(gameData, slot, equipment.get(slot))).join("")}
        </div>
      </section>
      <section class="loadout-dialogue-panel">
        <h3>${uiLabels.loadout.dialogueTitle}</h3>
        <div class="loadout-speech">${renderDialogue(gameData, adventurer, carriedItems, equipment, canSeeMoney, canSeeItems)}</div>
        <h3>${uiLabels.loadout.moneyTitle}</h3>
        ${buildMoneyMarkup(adventurer, canSeeMoney)}
        <h3>${uiLabels.loadout.carriedTitle}</h3>
        ${buildCarriedItemListMarkup(carriedItems, canSeeItems)}
      </section>
    </div>
  `;
}

function openEquipmentRenameLayer(gameData: GameData, elements: Elements, instanceId: string): void {
  const layer = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-layer");
  const input = elements.loadoutModal?.querySelector<HTMLInputElement>("#equip-rename-input");
  const label = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-label");
  const equipment = gameData.player.inventory.equipments.find((candidate) => candidate.instanceId === instanceId);
  if (!layer || !input || !label || !equipment) {
    return;
  }

  const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === equipment.definitionId);
  const slotLabel = uiLabels.equipmentSlots[equipment.slot];
  pendingRenameInstanceId = instanceId;
  label.textContent = `${slotLabel} · ${definition?.shortName ?? definition?.name ?? equipment.definitionId}`;
  input.value = equipment.customName ?? "";
  input.placeholder = uiLabels.loadout.renamePlaceholder;
  updateEquipmentRenamePreview(elements, input.value);
  layer.hidden = false;
  input.focus();
  input.select();
}

function closeEquipmentRenameLayer(elements: Elements): void {
  pendingRenameInstanceId = null;
  const layer = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-layer");
  if (layer) {
    layer.hidden = true;
  }
}

function submitEquipmentRename(gameData: GameData, elements: Elements): void {
  if (!pendingRenameInstanceId || !activeLoadoutAdventurerId) {
    return;
  }

  const input = elements.loadoutModal?.querySelector<HTMLInputElement>("#equip-rename-input");
  const equipment = gameData.player.inventory.equipments.find((candidate) => candidate.instanceId === pendingRenameInstanceId);
  if (!input || !equipment) {
    closeEquipmentRenameLayer(elements);
    return;
  }

  const trimmed = input.value.trim();
  if (trimmed.length > 0 && !isRichTextWithinVisibleLimit(trimmed)) {
    updateEquipmentRenamePreview(elements, trimmed);
    input.focus();
    return;
  }

  equipment.customName = trimmed.length > 0 ? trimmed : null;
  saveGameData(gameData);
  closeEquipmentRenameLayer(elements);
  renderLoadoutDialog(gameData, elements, activeLoadoutAdventurerId);
}

function getClickElement(event: Event): Element | null {
  const target = event.target;
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Text) {
    return target.parentElement;
  }

  return null;
}

function getAdventurerEquipment(gameData: GameData, adventurer: Adventurer): Map<EquipmentSlot, EquipmentInstance> {
  const equipmentBySlot = new Map<EquipmentSlot, EquipmentInstance>();
  gameData.player.inventory.equipments
    .filter((equipment) => equipment.equippedByAdventurerId === adventurer.id)
    .forEach((equipment) => {
      if (!equipmentBySlot.has(equipment.slot)) {
        equipmentBySlot.set(equipment.slot, equipment);
      }
    });
  return equipmentBySlot;
}

type VisibleCarriedItem = {
  id: string;
  itemId: string;
  name: string;
  icon: string;
  amount: number;
  remainingShelfLife: number;
  remainingUses: number;
};

function getCarriedItems(gameData: GameData, adventurer: Adventurer): VisibleCarriedItem[] {
  const giftedItems = (adventurer.giftedItems ?? [])
    .map((gift) => {
      const item = gameData.itemDefinitions.find((candidate) => candidate.id === gift.itemId);
      return item
        ? {
          id: gift.giftId,
          itemId: gift.itemId,
          name: item.name,
          icon: item.icon,
          amount: 1,
          remainingShelfLife: gift.remainingShelfLife,
          remainingUses: gift.remainingUses
        }
        : null;
    })
    .filter((item): item is VisibleCarriedItem => item !== null);
  const personalItems = (adventurer.carriedItems ?? [])
    .map((carriedItem) => getVisibleCarriedItem(gameData, carriedItem))
    .filter((item): item is VisibleCarriedItem => item !== null);
  return [...giftedItems, ...personalItems];
}

function buildEquipmentSlotMarkup(
  gameData: GameData,
  slot: EquipmentSlot,
  equipment: EquipmentInstance | undefined
): string {
  const slotClass = `paperdoll-slot slot-${slot}`;
  const slotLabel = uiLabels.equipmentSlots[slot];

  if (!equipment) {
    return `
      <article class="${slotClass} is-empty">
        <span class="paperdoll-slot-label">${slotLabel}</span>
        <div class="paperdoll-slot-card">
          <span class="paperdoll-slot-empty">${uiLabels.loadout.emptySlot}</span>
        </div>
      </article>
    `;
  }

  const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === equipment.definitionId);
  const icon = definition?.icon ?? "◆";

  return `
    <article class="${slotClass} is-filled">
      <span class="paperdoll-slot-label">${slotLabel}</span>
      <div class="paperdoll-slot-card">
        <span class="paperdoll-slot-icon" aria-hidden="true">${icon}</span>
        ${renderEquipmentNameButton(equipment, definition)}
      </div>
    </article>
  `;
}

function buildMoneyMarkup(adventurer: Adventurer, canSeeMoney: boolean): string {
  if (!canSeeMoney) {
    return `<p class="empty-state">${uiLabels.loadout.hiddenMoney}</p>`;
  }

  return `
    <article class="loadout-money-row">
      <strong><span class="loadout-highlight money">${adventurer.carriedMoney}</span> ${uiLabels.loadout.moneySuffix}</strong>
    </article>
  `;
}

function buildCarriedItemListMarkup(items: VisibleCarriedItem[], canSeeItems: boolean): string {
  if (!canSeeItems) {
    return `<p class="empty-state">${uiLabels.loadout.hiddenCarriedItems}</p>`;
  }

  if (items.length === 0) {
    return `<p class="empty-state">${uiLabels.loadout.emptyCarriedItems}</p>`;
  }

  return `
    <div class="loadout-item-list">
      ${items.map((item) => `
        <article class="loadout-item-row">
          <strong><span class="loadout-highlight item">${escapeHtml(item.icon)} ${escapeHtml(item.name)}</span></strong>
          <span>${uiLabels.loadout.amount} <span class="loadout-highlight count">${item.amount}</span></span>
          <span>${uiLabels.loadout.shelfLife} <span class="loadout-highlight time">${item.remainingShelfLife}</span> ${uiLabels.loadout.questSuffix}</span>
          <span>${uiLabels.loadout.uses} <span class="loadout-highlight count">${item.remainingUses}</span> ${uiLabels.loadout.useSuffix}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDialogue(
  gameData: GameData,
  adventurer: Adventurer,
  carriedItems: VisibleCarriedItem[],
  equipment: Map<EquipmentSlot, EquipmentInstance>,
  canSeeMoney: boolean,
  canSeeItems: boolean
): string {
  const template = selectDialogueTemplate(adventurer);
  const replacements = {
    name: `<span class="loadout-highlight name">${escapeHtml(adventurer.name)}</span>`,
    itemClause: buildItemClause(carriedItems, canSeeItems),
    equipmentClause: buildEquipmentClause(gameData, equipment),
    moneyClause: buildMoneyClause(adventurer, canSeeMoney)
  };
  return normalizeDialoguePunctuation(renderTemplate(template.text, replacements));
}

function selectDialogueTemplate(adventurer: Adventurer) {
  const dominantPersonality = getDominantPersonality(adventurer);
  return loadoutDialogueTemplates.find((template) => template.personality === dominantPersonality)
    ?? loadoutDialogueTemplates.find((template) => template.personality === "balanced")
    ?? loadoutDialogueTemplates[0];
}

function getDominantPersonality(adventurer: Adventurer): AdventurerPersonalityAxis | "balanced" {
  const entries = Object.entries(adventurer.personality) as Array<[AdventurerPersonalityAxis, number]>;
  const sorted = entries.sort((left, right) => right[1] - left[1]);
  const [first, second] = sorted;
  if (!first) {
    return "balanced";
  }
  if (second && first[1] - second[1] < 0.08) {
    return "balanced";
  }
  return first[0];
}

function buildItemClause(items: VisibleCarriedItem[], canSeeItems: boolean): string {
  if (!canSeeItems) {
    return `<span class="loadout-muted">${uiLabels.loadout.itemClauseHidden}</span>`;
  }

  if (items.length === 0) {
    return `<span class="loadout-muted">${uiLabels.loadout.itemClauseEmpty}</span>`;
  }

  const itemList = renderDialogueItemList(items);
  return uiLabels.loadout.itemClauseWithItems(itemList);
}

function buildEquipmentClause(
  gameData: GameData,
  equipment: Map<EquipmentSlot, EquipmentInstance>
): string {
  const equipmentNames = Array.from(equipment.values()).map((item) => {
    const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === item.definitionId);
    const label = getEquipmentPrimaryLabel(item, definition);
    return `<span class="loadout-highlight equipment">${escapeHtml(label)}</span>`;
  });

  if (equipmentNames.length === 0) {
    return `<span class="loadout-muted">${uiLabels.loadout.equipmentClauseEmpty}</span>`;
  }

  return uiLabels.loadout.equipmentClauseWithItems(equipmentNames.join("、"));
}

function buildMoneyClause(adventurer: Adventurer, canSeeMoney: boolean): string {
  if (!canSeeMoney) {
    return `<span class="loadout-muted">${uiLabels.loadout.moneyClauseHidden}</span>`;
  }

  const amount = `<span class="loadout-highlight money">${adventurer.carriedMoney}</span>${uiLabels.loadout.moneySuffix}`;
  return uiLabels.loadout.moneyClauseWithAmount(amount);
}

function renderDialogueItemList(items: VisibleCarriedItem[]): string {
  return items.map((item) => {
    return `<span class="loadout-highlight item">${escapeHtml(item.name)}</span>`
      + ` x<span class="loadout-highlight count">${item.amount}</span>`
      + `（<span class="loadout-highlight time">${item.remainingShelfLife}</span>${uiLabels.loadout.questSuffix}`
      + `，<span class="loadout-highlight count">${item.remainingUses}</span>${uiLabels.loadout.useSuffix}）`;
  }).join("、");
}

function getVisibleCarriedItem(gameData: GameData, carriedItem: AdventurerCarriedItem): VisibleCarriedItem | null {
  const item = gameData.itemDefinitions.find((candidate) => candidate.id === carriedItem.itemId);
  if (!item) {
    return null;
  }

  return {
    id: carriedItem.carryId,
    itemId: carriedItem.itemId,
    name: item.name,
    icon: item.icon,
    amount: carriedItem.amount,
    remainingShelfLife: carriedItem.remainingShelfLife,
    remainingUses: carriedItem.remainingUses
  };
}

function canSeeCarriedMoney(adventurer: Adventurer): boolean {
  return adventurer.knownLevel === "familiar" || adventurer.knownLevel === "trusted";
}

function canSeeAllCarriedItems(adventurer: Adventurer): boolean {
  return adventurer.knownLevel === "trusted";
}

function renderTemplate(template: string, replacements: Record<string, string>): string {
  return escapeHtml(template).replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => replacements[key] ?? match);
}

function normalizeDialoguePunctuation(dialogue: string): string {
  return dialogue
    .replace(/。[。]+/g, "。")
    .replace(/。，/g, "，")
    .replace(/，。/g, "。")
    .replace(/，{2,}/g, "，");
}

function renderPaperdollFigure(): string {
  return `
    <svg class="paperdoll-figure" viewBox="0 0 110 320" aria-hidden="true">
      <g fill="rgba(181, 137, 82, 0.16)" stroke="#8a6a45" stroke-width="2" stroke-linejoin="round">
        <circle cx="55" cy="27" r="24" />
        <rect x="24" y="56" width="62" height="98" rx="18" />
        <rect x="4" y="74" width="18" height="72" rx="9" />
        <circle cx="13" cy="156" r="11" />
        <rect x="88" y="74" width="18" height="72" rx="9" />
        <circle cx="97" cy="156" r="11" />
        <rect x="30" y="158" width="22" height="88" rx="10" />
        <circle cx="41" cy="256" r="12" />
        <rect x="58" y="158" width="22" height="88" rx="10" />
        <circle cx="69" cy="256" r="12" />
      </g>
    </svg>
  `;
}

function renderPaperdollLinks(filledSlots: EquipmentSlot[]): string {
  const lines = filledSlots.map((slot) => {
    const link = PAPERDOLL_LINKS[slot];
    return `<line x1="${link.from.x}" y1="${link.from.y}" x2="${link.to.x}" y2="${link.to.y}" />`;
  }).join("");

  return `
    <svg class="paperdoll-links" viewBox="0 0 420 470" aria-hidden="true">
      ${lines}
    </svg>
  `;
}

function updateEquipmentRenamePreview(elements: Elements, rawValue: string): void {
  const counter = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-counter");
  const preview = elements.loadoutModal?.querySelector<HTMLElement>("#equip-rename-preview");
  const visibleLength = getRichTextVisibleLength(rawValue);
  if (counter) {
    counter.textContent = uiLabels.loadout.renameVisibleLength(visibleLength, RICH_TEXT_MAX_VISIBLE_LENGTH);
    counter.classList.toggle("is-over-limit", visibleLength > RICH_TEXT_MAX_VISIBLE_LENGTH);
  }

  if (preview) {
    preview.innerHTML = rawValue.trim().length > 0
      ? renderRichTextToHtml(rawValue)
      : `<span class="equip-rename-preview-empty">${uiLabels.loadout.renamePreviewEmpty}</span>`;
  }
}

function showEquipmentTooltip(
  gameData: GameData,
  elements: Elements,
  button: HTMLButtonElement,
  event: MouseEvent
): void {
  const tooltip = elements.loadoutModal?.querySelector<HTMLElement>("#equip-tooltip");
  const instanceId = button.dataset.equipmentInstanceId;
  if (!tooltip || !instanceId) {
    return;
  }

  const equipment = gameData.player.inventory.equipments.find((candidate) => candidate.instanceId === instanceId);
  if (!equipment) {
    return;
  }

  const definition = gameData.equipmentDefinitions.find((candidate) => candidate.id === equipment.definitionId);
  const content = getEquipmentTooltipContent(equipment, definition);
  tooltip.innerHTML = `
    <strong class="equip-tooltip-title">${escapeHtml(content.title)}</strong>
    ${content.description ? `<p class="equip-tooltip-description">${escapeHtml(content.description)}</p>` : ""}
    ${content.flavorLines.length > 0
      ? `<ul class="equip-tooltip-flavor">${content.flavorLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      : ""}
  `;
  tooltip.hidden = false;
  positionEquipmentTooltip(tooltip, event);
}

function hideEquipmentTooltip(elements: Elements): void {
  const tooltip = elements.loadoutModal?.querySelector<HTMLElement>("#equip-tooltip");
  if (tooltip) {
    tooltip.hidden = true;
    tooltip.innerHTML = "";
  }
}

function positionEquipmentTooltip(tooltip: HTMLElement, event: MouseEvent): void {
  const dialog = tooltip.closest(".loadout-dialog");
  if (!(dialog instanceof HTMLElement)) {
    return;
  }

  const dialogRect = dialog.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth || 240;
  const tooltipHeight = tooltip.offsetHeight || 120;
  const left = Math.min(
    Math.max(event.clientX - dialogRect.left + 14, 12),
    dialogRect.width - tooltipWidth - 12
  );
  const top = Math.min(
    Math.max(event.clientY - dialogRect.top + 14, 12),
    dialogRect.height - tooltipHeight - 12
  );
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
