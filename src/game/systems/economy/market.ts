import {
  addItemStack,
  addStock,
  getItemStackAmount,
  getStockAmount,
  removeItemStack,
  removeStock
} from "../inventory";
import type {ActionResult, GameData} from "../../core/types";
import {canSellItemAtMarket, canSellResourceAtMarket} from "./establishment";
import {
  addMarketStock,
  getMarketStockAmount,
  getPlayerHoldingAmount,
  removeMarketStock
} from "./marketStock";
import {getBuyPrice, getSellPrice, getTradeTotalPrice} from "./marketPricing";

export function sellResourceToMarket(gameData: GameData, resourceId: string, quantity: number): ActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {ok: false, type: "error", message: "出售数量无效。"};
  }

  if (!canSellResourceAtMarket(gameData, resourceId)) {
    return {ok: false, type: "error", message: "这类资源不能在市场出售。"};
  }

  const available = getStockAmount(gameData, resourceId);
  if (available < quantity) {
    return {ok: false, type: "error", message: "库存数量不足。"};
  }

  const unitPrice = getSellPrice(gameData, "resource", resourceId);
  const totalPrice = getTradeTotalPrice(unitPrice, quantity);
  removeStock(gameData, resourceId, quantity);
  addMarketStock(gameData, "resource", resourceId, quantity);
  gameData.player.money += totalPrice;

  const resource = gameData.resources.find((candidate) => candidate.id === resourceId);
  return {
    ok: true,
    type: "success",
    message: `已向市场出售 ${quantity} 单位 ${resource?.name ?? resourceId}，获得 ${totalPrice} 钱。`
  };
}

export function buyResourceFromMarket(gameData: GameData, resourceId: string, quantity: number): ActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {ok: false, type: "error", message: "采购数量无效。"};
  }

  const listing = gameData.marketListings.find(
    (candidate) => candidate.kind === "resource" && candidate.refId === resourceId && candidate.buyable
  );
  if (!listing) {
    return {ok: false, type: "error", message: "市场当前不出售这种资源。"};
  }

  if (getMarketStockAmount(gameData, "resource", resourceId) < quantity) {
    return {ok: false, type: "error", message: "市场库存不足，无法完成采购。"};
  }

  const unitPrice = getBuyPrice(gameData, "resource", resourceId);
  const totalPrice = getTradeTotalPrice(unitPrice, quantity);
  if (gameData.player.money < totalPrice) {
    return {ok: false, type: "error", message: "资金不足，无法完成采购。"};
  }

  if (!removeMarketStock(gameData, "resource", resourceId, quantity)) {
    return {ok: false, type: "error", message: "市场库存不足，无法完成采购。"};
  }

  gameData.player.money -= totalPrice;
  addStock(gameData, resourceId, quantity);

  const resource = gameData.resources.find((candidate) => candidate.id === resourceId);
  return {
    ok: true,
    type: "success",
    message: `已从市场购入 ${quantity} 单位 ${resource?.name ?? resourceId}，花费 ${totalPrice} 钱。`
  };
}

export function sellItemToMarket(gameData: GameData, itemId: string, quantity: number): ActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {ok: false, type: "error", message: "出售数量无效。"};
  }

  if (!canSellItemAtMarket(gameData, itemId)) {
    return {ok: false, type: "error", message: "这类物品不能在市场出售。"};
  }

  const available = getItemStackAmount(gameData, itemId);
  if (available < quantity) {
    return {ok: false, type: "error", message: "物品数量不足。"};
  }

  const unitPrice = getSellPrice(gameData, "item", itemId);
  const totalPrice = getTradeTotalPrice(unitPrice, quantity);
  removeItemStack(gameData, itemId, quantity);
  addMarketStock(gameData, "item", itemId, quantity);
  gameData.player.money += totalPrice;

  const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
  return {
    ok: true,
    type: "success",
    message: `已向市场出售 ${quantity} 个 ${item?.name ?? itemId}，获得 ${totalPrice} 钱。`
  };
}

export function buyItemFromMarket(gameData: GameData, itemId: string, quantity: number): ActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {ok: false, type: "error", message: "采购数量无效。"};
  }

  const listing = gameData.marketListings.find(
    (candidate) => candidate.kind === "item" && candidate.refId === itemId && candidate.buyable
  );
  if (!listing) {
    return {ok: false, type: "error", message: "市场当前不出售这种物品。"};
  }

  if (getMarketStockAmount(gameData, "item", itemId) < quantity) {
    return {ok: false, type: "error", message: "市场库存不足，无法完成采购。"};
  }

  const unitPrice = getBuyPrice(gameData, "item", itemId);
  const totalPrice = getTradeTotalPrice(unitPrice, quantity);
  if (gameData.player.money < totalPrice) {
    return {ok: false, type: "error", message: "资金不足，无法完成采购。"};
  }

  if (!removeMarketStock(gameData, "item", itemId, quantity)) {
    return {ok: false, type: "error", message: "市场库存不足，无法完成采购。"};
  }

  gameData.player.money -= totalPrice;
  addItemStack(gameData, itemId, quantity);

  const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
  return {
    ok: true,
    type: "success",
    message: `已从市场购入 ${quantity} 个 ${item?.name ?? itemId}，花费 ${totalPrice} 钱。`
  };
}

export function canBuyFromMarket(
  gameData: GameData,
  kind: "resource" | "item",
  refId: string,
  quantity: number,
  unitPrice: number
): boolean {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return false;
  }

  const listing = gameData.marketListings.find(
    (candidate) => candidate.kind === kind && candidate.refId === refId && candidate.buyable
  );
  if (!listing) {
    return false;
  }

  return gameData.player.money >= unitPrice * quantity
    && getMarketStockAmount(gameData, kind, refId) >= quantity;
}

export function canSellToMarket(
  gameData: GameData,
  entry: ReturnType<typeof getMarketListingViewModels>[number],
  quantity: number
): boolean {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return false;
  }

  if (!entry.listing.sellable || !entry.canSell) {
    return false;
  }

  return entry.playerAmount >= quantity;
}

export function getMarketListingViewModels(gameData: GameData) {
  return gameData.marketListings.map((listing) => {
    if (listing.kind === "resource") {
      const resource = gameData.resources.find((candidate) => candidate.id === listing.refId);
      return {
        listing,
        label: resource ? `${resource.icon} ${resource.name}` : listing.refId,
        buyPrice: getBuyPrice(gameData, "resource", listing.refId),
        sellPrice: getSellPrice(gameData, "resource", listing.refId),
        marketAmount: getMarketStockAmount(gameData, "resource", listing.refId),
        playerAmount: getPlayerHoldingAmount(gameData, "resource", listing.refId),
        canSell: listing.sellable && canSellResourceAtMarket(gameData, listing.refId)
      };
    }

    const item = gameData.itemDefinitions.find((candidate) => candidate.id === listing.refId);
    return {
      listing,
      label: item ? `${item.icon} ${item.name}` : listing.refId,
      buyPrice: getBuyPrice(gameData, "item", listing.refId),
      sellPrice: getSellPrice(gameData, "item", listing.refId),
      marketAmount: getMarketStockAmount(gameData, "item", listing.refId),
      playerAmount: getPlayerHoldingAmount(gameData, "item", listing.refId),
      canSell: listing.sellable && canSellItemAtMarket(gameData, listing.refId)
    };
  });
}
