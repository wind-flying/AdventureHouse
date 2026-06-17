import type {GameData} from "../../core/types";
import {getItemDefinition, getResourceDefinition} from "./pricing";

export function getAnchorPrice(gameData: GameData, kind: "resource" | "item", refId: string): number {
  if (kind === "resource") {
    const resource = getResourceDefinition(gameData, refId);
    if (!resource || typeof resource.basePrice !== "number" || resource.basePrice < 0) {
      return 1;
    }

    return resource.basePrice;
  }

  const item = getItemDefinition(gameData, refId);
  if (!item) {
    return 1;
  }

  if (typeof item.basePrice === "number" && item.basePrice >= 0) {
    return item.basePrice;
  }

  return item.giftValue;
}

export function getBuyPrice(gameData: GameData, kind: "resource" | "item", refId: string): number {
  const anchor = getAnchorPrice(gameData, kind, refId);
  return Math.max(1, Math.ceil(anchor * gameData.marketPricing.buyMultiplier));
}

export function getSellPrice(gameData: GameData, kind: "resource" | "item", refId: string): number {
  const anchor = getAnchorPrice(gameData, kind, refId);
  return Math.max(1, Math.floor(anchor * gameData.marketPricing.sellMultiplier));
}

export function getTradeTotalPrice(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export {getItemDefinition, getResourceDefinition} from "./pricing";
