import type {GameData} from "../../core/types";
import {getItemStackAmount, getStockAmount} from "../inventory";

export type MarketRefKind = "resource" | "item";

export function toMarketStockKey(kind: MarketRefKind, refId: string): string {
  return `${kind}:${refId}`;
}

export function parseMarketStockKey(key: string): {kind: MarketRefKind; refId: string} | null {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const kind = key.slice(0, separatorIndex);
  if (kind !== "resource" && kind !== "item") {
    return null;
  }

  const refId = key.slice(separatorIndex + 1);
  return refId ? {kind, refId} : null;
}

export function getMarketStockAmount(gameData: GameData, kind: MarketRefKind, refId: string): number {
  return gameData.marketStock[toMarketStockKey(kind, refId)] ?? 0;
}

export function addMarketStock(gameData: GameData, kind: MarketRefKind, refId: string, quantity: number): void {
  if (quantity <= 0) {
    return;
  }

  const key = toMarketStockKey(kind, refId);
  gameData.marketStock[key] = getMarketStockAmount(gameData, kind, refId) + quantity;
}

export function removeMarketStock(
  gameData: GameData,
  kind: MarketRefKind,
  refId: string,
  quantity: number
): boolean {
  if (quantity <= 0) {
    return false;
  }

  const available = getMarketStockAmount(gameData, kind, refId);
  if (available < quantity) {
    return false;
  }

  const key = toMarketStockKey(kind, refId);
  const nextAmount = available - quantity;
  if (nextAmount === 0) {
    delete gameData.marketStock[key];
  } else {
    gameData.marketStock[key] = nextAmount;
  }

  return true;
}

export function getPlayerHoldingAmount(gameData: GameData, kind: MarketRefKind, refId: string): number {
  return kind === "resource" ? getStockAmount(gameData, refId) : getItemStackAmount(gameData, refId);
}

export function createEmptyMarketStock(): Record<string, number> {
  return {};
}

export function sanitizeMarketStock(
  stock: Record<string, number> | undefined,
  gameData: GameData
): Record<string, number> {
  if (!stock || typeof stock !== "object") {
    return {};
  }

  const knownResourceIds = new Set(gameData.resources.map((resource) => resource.id));
  const knownItemIds = new Set(gameData.itemDefinitions.map((item) => item.id));

  return Object.fromEntries(
    Object.entries(stock).filter(([key, amount]) => {
      if (!Number.isInteger(amount) || amount <= 0) {
        return false;
      }

      const parsed = parseMarketStockKey(key);
      if (!parsed) {
        return false;
      }

      return parsed.kind === "resource"
        ? knownResourceIds.has(parsed.refId)
        : knownItemIds.has(parsed.refId);
    })
  );
}
