import {addItemStack, getItemStackAmount, getStockAmount, removeItemStack, removeStock} from "../inventory";
import type {ActionResult, CraftingRecipe, GameData, StoryEntry} from "../../core/types";
import {createStoryEntry} from "../../text/storyText";

export function craftItem(gameData: GameData, recipeId: string, batchCount = 1): ActionResult {
  if (!Number.isInteger(batchCount) || batchCount <= 0) {
    return {ok: false, type: "error", message: "制作数量无效。"};
  }

  const recipe = gameData.craftingRecipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) {
    return {ok: false, type: "error", message: "找不到这条制作配方。"};
  }

  const outputItem = gameData.itemDefinitions.find((candidate) => candidate.id === recipe.outputItemId);
  if (!outputItem) {
    return {ok: false, type: "error", message: "制作配方引用了无效物品。"};
  }

  if (!canCraftRecipeBatch(gameData, recipe, batchCount)) {
    return {ok: false, type: "error", message: "原料不足，无法制作。"};
  }

  recipe.inputs.forEach((input) => {
    const totalQuantity = input.quantity * batchCount;
    if (input.kind === "resource") {
      removeStock(gameData, input.refId, totalQuantity);
      return;
    }

    removeItemStack(gameData, input.refId, totalQuantity);
  });

  const outputQuantity = recipe.outputQuantity * batchCount;
  addItemStack(gameData, recipe.outputItemId, outputQuantity);
  return {
    ok: true,
    type: "success",
    message: `制作完成：获得 ${outputQuantity} 个 ${outputItem.name}。`
  };
}

export function getCraftingRecipeViewModels(gameData: GameData) {
  return gameData.craftingRecipes.map((recipe) => ({
    recipe,
    outputItem: gameData.itemDefinitions.find((candidate) => candidate.id === recipe.outputItemId) ?? null,
    inputs: recipe.inputs.map((input) => {
      if (input.kind === "resource") {
        const resource = gameData.resources.find((candidate) => candidate.id === input.refId);
        return {
          ...input,
          label: resource ? `${resource.icon} ${resource.name}` : input.refId,
          available: getStockAmount(gameData, input.refId)
        };
      }

      const item = gameData.itemDefinitions.find((candidate) => candidate.id === input.refId);
      return {
        ...input,
        label: item ? `${item.icon} ${item.name}` : input.refId,
        available: getItemStackAmount(gameData, input.refId)
      };
    }),
    canCraft: canCraftRecipeBatch(gameData, recipe, 1),
    canCraftBatch: (batchCount: number) => canCraftRecipeBatch(gameData, recipe, batchCount)
  }));
}

export function applyQuestResultItems(
  gameData: GameData,
  itemRewards: {itemId: string; quantity: number}[],
  nextDayEntries: StoryEntry[]
): void {
  itemRewards.forEach(({itemId, quantity}) => {
    const item = gameData.itemDefinitions.find((candidate) => candidate.id === itemId);
    if (!item || quantity <= 0) {
      return;
    }

    addItemStack(gameData, itemId, quantity);
    nextDayEntries.push(
      createStoryEntry("item_received", {
        day: gameData.day,
        quantity,
        itemName: item.name
      })
    );
  });
}

function canCraftRecipeBatch(gameData: GameData, recipe: CraftingRecipe, batchCount: number): boolean {
  if (!Number.isInteger(batchCount) || batchCount <= 0) {
    return false;
  }

  return recipe.inputs.every((input) => {
    const available = input.kind === "resource"
      ? getStockAmount(gameData, input.refId)
      : getItemStackAmount(gameData, input.refId);
    return available >= input.quantity * batchCount;
  });
}
