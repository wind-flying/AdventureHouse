import type {GameData, ItemDefinition, ResourceDefinition} from "../../core/types";

const DEFAULT_ITEM_MARKET_PRICE = 1;

export function getResourceDefinition(gameData: GameData, resourceId: string): ResourceDefinition | null {
  return gameData.resources.find((resource) => resource.id === resourceId) ?? null;
}

export function getItemDefinition(gameData: GameData, itemId: string): ItemDefinition | null {
  return gameData.itemDefinitions.find((item) => item.id === itemId) ?? null;
}

/** @deprecated Use getAnchorPrice from marketPricing.ts */
export function getResourceMarketPrice(gameData: GameData, resourceId: string): number {
  const resource = getResourceDefinition(gameData, resourceId);
  if (!resource || typeof resource.basePrice !== "number" || resource.basePrice < 0) {
    return DEFAULT_ITEM_MARKET_PRICE;
  }

  return resource.basePrice;
}

/** @deprecated Use getAnchorPrice from marketPricing.ts */
export function getItemMarketPrice(gameData: GameData, itemId: string): number {
  const item = getItemDefinition(gameData, itemId);
  if (!item) {
    return DEFAULT_ITEM_MARKET_PRICE;
  }

  if (typeof item.basePrice === "number" && item.basePrice >= 0) {
    return item.basePrice;
  }

  return item.giftValue;
}

export function getTradeTotalPrice(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
