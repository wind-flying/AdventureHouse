import type {EquipmentInstance} from "../core/types";
import {getEquipmentEffectFlavorLines} from "../text/equipmentEffectText";
import {
  getRichTextVisibleLength,
  isRichTextWithinVisibleLimit,
  renderRichTextToHtml,
  RICH_TEXT_MAX_VISIBLE_LENGTH,
  stripRichTextFormatting
} from "../text/richText";
import {uiLabels} from "../text/uiLabels";

export {RICH_TEXT_MAX_VISIBLE_LENGTH, getRichTextVisibleLength, isRichTextWithinVisibleLimit};

export function getEquipmentDefinitionName(
  equipment: EquipmentInstance,
  definition: {name: string; shortName?: string} | null | undefined
): {shortName: string; fullName: string} {
  const fullName = definition?.name ?? equipment.definitionId;
  const shortName = definition?.shortName ?? fullName;
  return {shortName, fullName};
}

export function getEquipmentPrimaryLabel(
  equipment: EquipmentInstance,
  definition: {name: string; shortName?: string} | null | undefined
): string {
  const customName = equipment.customName?.trim();
  if (customName) {
    return stripRichTextFormatting(customName);
  }

  const {shortName} = getEquipmentDefinitionName(equipment, definition);
  return shortName;
}

export function renderEquipmentNameButton(
  equipment: EquipmentInstance,
  definition: {
    name: string;
    shortName?: string;
    icon?: string;
    playerDescription?: string;
  } | null | undefined
): string {
  const {shortName} = getEquipmentDefinitionName(equipment, definition);
  const customName = equipment.customName?.trim();
  const labelHtml = customName
    ? renderRichTextToHtml(customName)
    : escapeHtml(shortName);

  return `
    <button
      type="button"
      class="equip-name${customName ? " equip-name--custom" : " equip-name--plain"}"
      data-equipment-instance-id="${escapeHtmlAttribute(equipment.instanceId)}"
      aria-label="${escapeHtmlAttribute(uiLabels.loadout.renameAction(customName ? stripRichTextFormatting(customName) : shortName))}"
    >${labelHtml}</button>
  `;
}

export function getEquipmentTooltipContent(
  equipment: EquipmentInstance,
  definition: {
    name: string;
    shortName?: string;
    playerDescription?: string;
  } | null | undefined
): {title: string; description: string; flavorLines: string[]} {
  const {fullName} = getEquipmentDefinitionName(equipment, definition);
  return {
    title: fullName,
    description: definition?.playerDescription?.trim() ?? "",
    flavorLines: getEquipmentEffectFlavorLines(equipment.effects)
  };
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeHtml(value: string): string {
  return escapeHtmlAttribute(value);
}
