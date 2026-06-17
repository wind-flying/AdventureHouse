import type {EstablishmentDefinition, GameData, ItemCategory, ResourceCategory} from "../../core/types";
import {getItemDefinition, getResourceDefinition} from "./pricing";

export function canSellResourceAtMarket(gameData: GameData, resourceId: string): boolean {
  const resource = getResourceDefinition(gameData, resourceId);
  if (!resource) {
    return false;
  }

  const category = resource.category ?? "misc";
  return gameData.establishment.marketSellableResourceCategories.includes(category);
}

export function canSellItemAtMarket(gameData: GameData, itemId: string): boolean {
  const item = getItemDefinition(gameData, itemId);
  if (!item) {
    return false;
  }

  return gameData.establishment.marketSellableItemCategories.includes(item.category);
}

export function canSellItemAtShop(gameData: GameData, itemId: string): boolean {
  const item = getItemDefinition(gameData, itemId);
  if (!item) {
    return false;
  }

  return gameData.establishment.sellableItemCategories.includes(item.category);
}

export function isResourceCategoryMarketable(
  establishment: EstablishmentDefinition,
  category: ResourceCategory
): boolean {
  return establishment.marketSellableResourceCategories.includes(category);
}

export function isItemCategoryMarketable(
  establishment: EstablishmentDefinition,
  category: ItemCategory
): boolean {
  return establishment.marketSellableItemCategories.includes(category);
}

export function isItemCategoryShopSellable(
  establishment: EstablishmentDefinition,
  category: ItemCategory
): boolean {
  return establishment.sellableItemCategories.includes(category);
}
