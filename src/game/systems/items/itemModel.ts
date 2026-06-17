import type {ItemDefinition} from "../../core/types";

export function isFoodItem(item: ItemDefinition): boolean {
  return item.category === "food" || item.consumableModel === "food";
}

export function isQuestConsumableItem(item: ItemDefinition): boolean {
  return !isFoodItem(item);
}
