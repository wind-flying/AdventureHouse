import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getStockSectionsViewModel} from "../viewModels";

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
  const sections = getStockSectionsViewModel(gameData);
  if (sections.length === 0) {
    elements.stockList.innerHTML = `<p class="empty-state">${uiLabels.stock.empty}</p>`;
    return;
  }

  sections.forEach((section) => {
    const sectionElement = document.createElement("details");
    sectionElement.className = "stock-section";
    sectionElement.open = true;
    sectionElement.innerHTML = `
      <summary class="stock-section-head">
        <h3>${section.title}</h3>
        <span><span class="stock-section-toggle" aria-hidden="true"></span>${section.summary}</span>
      </summary>
    `;

    section.groups.forEach((group) => {
      const groupElement = document.createElement("section");
      groupElement.className = "stock-subsection";
      groupElement.innerHTML = group.title ? `<h4>${group.title}</h4>` : "";
      const itemsElement = document.createElement("div");
      itemsElement.className = "stock-items";

      group.items.forEach((stockItem) => {
        const item = document.createElement("div");
        item.className = "stock-item";
        item.innerHTML = `
          <span>
            <strong>${stockItem.label}</strong>
            ${stockItem.description ? `<small>${stockItem.description}</small>` : ""}
          </span>
          <strong>${stockItem.amount}</strong>
        `;
        itemsElement.appendChild(item);
      });

      groupElement.appendChild(itemsElement);
      sectionElement.appendChild(groupElement);
    });

    elements.stockList?.appendChild(sectionElement);
  });
}
