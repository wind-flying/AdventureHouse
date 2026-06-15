import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getStockItemViewModel} from "../viewModels";

export function getStockTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="stock" hidden>
      <div class="panel-head"><h2>${uiLabels.panels.stockTitle}</h2><p>${uiLabels.panels.stockDescription}</p></div>
      <div id="stock-list" class="stock-list"></div>
    </section>
  `;
}

export function renderStockTab(gameData: GameData, elements: Elements): void {
  if (!elements.stockList) {
    return;
  }

  elements.stockList.innerHTML = "";
  gameData.resources.forEach((resource) => {
    const item = document.createElement("div");
    const stockItem = getStockItemViewModel(gameData, resource.id, gameData.player.stock[resource.id] ?? 0);
    item.className = "stock-item";
    item.innerHTML = `<span>${stockItem.label}</span><strong>${stockItem.amount}</strong>`;
    elements.stockList?.appendChild(item);
  });
}
