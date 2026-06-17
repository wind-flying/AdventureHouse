import {getItemStackAmount} from "../inventory";
import type {GameData, StoryEntry} from "../../core/types";
import {canSellItemAtShop} from "./establishment";
import {getItemMarketPrice} from "./pricing";

const SHOP_PRICE_LIMITS = {
  minShopPrice: 1,
  maxShopPrice: 99
} as const;

export function getShopPrice(gameData: GameData, itemId: string): number {
  const configured = gameData.player.shopPrices[itemId];
  if (typeof configured === "number" && Number.isInteger(configured)) {
    return clampShopPrice(configured);
  }

  return getItemMarketPrice(gameData, itemId);
}

export function setShopPrice(gameData: GameData, itemId: string, price: number): {ok: boolean; message: string} {
  if (!canSellItemAtShop(gameData, itemId)) {
    return {ok: false, message: "当前店铺不能出售这类物品。"};
  }

  if (!Number.isInteger(price)) {
    return {ok: false, message: "售价必须是整数。"};
  }

  gameData.player.shopPrices[itemId] = clampShopPrice(price);
  const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
  return {ok: true, message: `已将 ${item?.name ?? itemId} 的售价设为 ${gameData.player.shopPrices[itemId]} 钱。`};
}

export function getShopSellableItems(gameData: GameData) {
  return gameData.itemDefinitions
    .filter((item) => canSellItemAtShop(gameData, item.id))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({
      item,
      shopPrice: getShopPrice(gameData, item.id),
      marketPrice: getItemMarketPrice(gameData, item.id),
      amount: getItemStackAmount(gameData, item.id)
    }));
}

export function simulateDailyInnRetail(_gameData: GameData, _nextDayEntries: StoryEntry[]): number {
  // v0.19：食物刚需分配已接管店售，关闭随机零售避免双轨扣库存。
  return 0;
}

function clampShopPrice(price: number): number {
  return Math.max(SHOP_PRICE_LIMITS.minShopPrice, Math.min(SHOP_PRICE_LIMITS.maxShopPrice, price));
}
