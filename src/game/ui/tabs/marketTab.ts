import type {Elements, GameData} from "../../core/types";
import {craftItem, getCraftingRecipeViewModels} from "../../systems/economy/crafting";
import {
  buyItemFromMarket,
  buyResourceFromMarket,
  canBuyFromMarket,
  canSellToMarket,
  getMarketListingViewModels,
  sellItemToMarket,
  sellResourceToMarket
} from "../../systems/economy/market";
import {getShopSellableItems, setShopPrice} from "../../systems/economy/innRetail";
import {getSatietyDescriptionForRef, getStackSatietySummaryForRef} from "../../text/satietyText";
import {uiLabels} from "../../text/uiLabels";

const BATCH_OPTIONS = [1, 10, 100] as const;
type BatchSize = (typeof BATCH_OPTIONS)[number];
type BatchSection = "market" | "craft";
type MarketSectionId = "trade" | "inn" | "shop" | "craft";

let marketBatchSize: BatchSize = 1;
let craftBatchSize: BatchSize = 1;

const marketSectionOpenState: Record<MarketSectionId, boolean> = {
  trade: true,
  inn: true,
  shop: true,
  craft: true
};

export function getMarketTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="market" hidden>
      <div class="panel-head">
        <h2>${uiLabels.panels.marketTitle}</h2>
        <p>${uiLabels.panels.marketDescription}</p>
      </div>
      <div id="market-list" class="market-list"></div>
    </section>
  `;
}

export function renderMarketTab(gameData: GameData, elements: Elements): void {
  if (!elements.marketList) {
    return;
  }

  elements.marketList.innerHTML = "";

  appendMarketSection(
    elements.marketList,
    "trade",
    uiLabels.market.tradeTitle,
    uiLabels.market.tradeDescription,
    createBatchToggleGroup("market", marketBatchSize),
    () => {
      const marketItems = document.createElement("div");
      marketItems.className = "market-items";

      getMarketListingViewModels(gameData).forEach((entry) => {
        const canBuy = entry.listing.buyable
          && canBuyFromMarket(gameData, entry.listing.kind, entry.listing.refId, marketBatchSize, entry.buyPrice);
        const canSell = canSellToMarket(gameData, entry, marketBatchSize);
        const satietyText = getSatietyDescriptionForRef(gameData, entry.listing.kind, entry.listing.refId);

        const row = document.createElement("div");
        row.className = "market-item";
        row.innerHTML = `
          <div>
            <strong>${entry.label}</strong>
            <small>${uiLabels.market.tradeHint(entry.buyPrice, entry.sellPrice, entry.marketAmount, entry.playerAmount)}${satietyText ? ` · ${satietyText}` : ""}</small>
          </div>
          <div class="market-item-actions">
            ${entry.listing.buyable
              ? `<button class="secondary-button market-buy" type="button" data-market-kind="${entry.listing.kind}" data-market-ref="${entry.listing.refId}" data-batch-size="${marketBatchSize}" ${canBuy ? "" : "disabled"}>${uiLabels.market.buyAction(marketBatchSize)}</button>`
              : ""}
            ${entry.listing.sellable && entry.canSell
              ? `<button class="ghost-button market-sell" type="button" data-market-kind="${entry.listing.kind}" data-market-ref="${entry.listing.refId}" data-batch-size="${marketBatchSize}" ${canSell ? "" : "disabled"}>${uiLabels.market.sellAction(marketBatchSize)}</button>`
              : ""}
          </div>
        `;
        marketItems.appendChild(row);
      });

      return marketItems;
    }
  );

  appendInnGroup(elements.marketList, (innBody) => {
    appendMarketSubSection(
      innBody,
      "shop",
      uiLabels.market.shopTitle,
      uiLabels.market.shopDescription,
      null,
      () => {
        const shopItems = document.createElement("div");
        shopItems.className = "market-items";

        getShopSellableItems(gameData).forEach(({item, shopPrice, marketPrice, amount}) => {
          const row = document.createElement("div");
          row.className = "market-item";
          row.innerHTML = `
            <div>
              <strong>${item.icon} ${item.name}</strong>
              <small>${uiLabels.market.shopHint(marketPrice, amount)}</small>
            </div>
            <div class="market-item-actions shop-price-actions">
              <input class="shop-price-input" type="number" min="1" max="99" value="${shopPrice}" data-shop-item-id="${item.id}" aria-label="${uiLabels.market.shopPriceLabel(item.name)}" />
              <button class="secondary-button shop-price-save" type="button" data-shop-item-id="${item.id}">${uiLabels.market.savePrice}</button>
            </div>
          `;
          shopItems.appendChild(row);
        });

        return shopItems;
      }
    );

    appendMarketSubSection(
      innBody,
      "craft",
      uiLabels.market.craftTitle,
      uiLabels.market.craftDescription,
      createBatchToggleGroup("craft", craftBatchSize),
      () => {
        const craftItems = document.createElement("div");
        craftItems.className = "market-items";

        getCraftingRecipeViewModels(gameData).forEach(({recipe, outputItem, inputs, canCraftBatch}) => {
          const canCraft = canCraftBatch(craftBatchSize);
          const inputText = inputs
            .map((input) => `${input.label} x${input.quantity * craftBatchSize} (${input.available})`)
            .join("，");
          const outputQuantity = recipe.outputQuantity * craftBatchSize;
          const satietyText = outputItem
            ? getStackSatietySummaryForRef(gameData, "item", outputItem.id, outputQuantity)
            : null;

          const row = document.createElement("div");
          row.className = "market-item";
          row.innerHTML = `
            <div>
              <strong>${outputItem ? `${outputItem.icon} ${outputItem.name}` : recipe.outputItemId} x${outputQuantity}</strong>
              <small>${uiLabels.market.craftInputs(inputText)}${satietyText ? ` · ${satietyText}` : ""}</small>
            </div>
            <div class="market-item-actions">
              <button class="primary-button craft-recipe" type="button" data-craft-recipe-id="${recipe.id}" data-batch-size="${craftBatchSize}" ${canCraft ? "" : "disabled"}>${uiLabels.market.craftAction(craftBatchSize)}</button>
            </div>
          `;
          craftItems.appendChild(row);
        });

        return craftItems;
      }
    );
  });
}

export function handleMarketAction(gameData: GameData, target: Element): {handled: boolean; result?: ReturnType<typeof sellResourceToMarket>} {
  const batchToggle = target.closest<HTMLButtonElement>(".batch-toggle");
  if (batchToggle?.dataset.batchSection && batchToggle.dataset.batchSize) {
    const section = batchToggle.dataset.batchSection as BatchSection;
    const batchSize = Number.parseInt(batchToggle.dataset.batchSize, 10) as BatchSize;
    if (BATCH_OPTIONS.includes(batchSize)) {
      if (section === "market") {
        marketBatchSize = batchSize;
      } else if (section === "craft") {
        craftBatchSize = batchSize;
      }
    }
    return {handled: true};
  }

  const buyButton = target.closest<HTMLButtonElement>(".market-buy");
  if (buyButton?.dataset.marketKind && buyButton.dataset.marketRef) {
    if (buyButton.disabled) {
      return {handled: true};
    }
    const quantity = getBatchSizeFromButton(buyButton, marketBatchSize);
    const result = buyButton.dataset.marketKind === "resource"
      ? buyResourceFromMarket(gameData, buyButton.dataset.marketRef, quantity)
      : buyItemFromMarket(gameData, buyButton.dataset.marketRef, quantity);
    return {handled: true, result};
  }

  const sellButton = target.closest<HTMLButtonElement>(".market-sell");
  if (sellButton?.dataset.marketKind && sellButton.dataset.marketRef) {
    if (sellButton.disabled) {
      return {handled: true};
    }
    const quantity = getBatchSizeFromButton(sellButton, marketBatchSize);
    const result = sellButton.dataset.marketKind === "resource"
      ? sellResourceToMarket(gameData, sellButton.dataset.marketRef, quantity)
      : sellItemToMarket(gameData, sellButton.dataset.marketRef, quantity);
    return {handled: true, result};
  }

  const craftButton = target.closest<HTMLButtonElement>(".craft-recipe");
  if (craftButton?.dataset.craftRecipeId) {
    if (craftButton.disabled) {
      return {handled: true};
    }
    const batchCount = getBatchSizeFromButton(craftButton, craftBatchSize);
    return {handled: true, result: craftItem(gameData, craftButton.dataset.craftRecipeId, batchCount)};
  }

  const savePriceButton = target.closest<HTMLButtonElement>(".shop-price-save");
  if (savePriceButton?.dataset.shopItemId) {
    const input = savePriceButton.parentElement?.querySelector<HTMLInputElement>(`[data-shop-item-id="${savePriceButton.dataset.shopItemId}"]`);
    const price = Number.parseInt(input?.value ?? "", 10);
    const result = setShopPrice(gameData, savePriceButton.dataset.shopItemId, price);
    return {
      handled: true,
      result: {
        ok: result.ok,
        type: result.ok ? "success" : "error",
        message: result.message
      }
    };
  }

  return {handled: false};
}

function appendInnGroup(container: HTMLElement, buildSubsections: (body: HTMLElement) => void): void {
  const details = document.createElement("details");
  details.className = "market-section market-inn-group";
  details.open = marketSectionOpenState.inn;
  details.addEventListener("toggle", () => {
    marketSectionOpenState.inn = details.open;
  });

  const summary = document.createElement("summary");
  summary.className = "market-section-head";

  const copy = document.createElement("div");
  copy.className = "market-section-copy";
  copy.innerHTML = `<h3>${uiLabels.market.innTitle}</h3><p>${uiLabels.market.innDescription}</p>`;

  const actions = document.createElement("div");
  actions.className = "market-section-actions";
  const toggle = document.createElement("span");
  toggle.className = "market-section-toggle";
  toggle.setAttribute("aria-hidden", "true");
  actions.appendChild(toggle);

  summary.append(copy, actions);

  const body = document.createElement("div");
  body.className = "market-inn-body";
  buildSubsections(body);

  details.append(summary, body);
  container.appendChild(details);
}

function appendMarketSubSection(
  container: HTMLElement,
  sectionId: Extract<MarketSectionId, "shop" | "craft">,
  title: string,
  description: string,
  headerExtras: HTMLElement | null,
  buildBody: () => HTMLElement
): void {
  const details = document.createElement("details");
  details.className = "market-subsection";
  details.open = marketSectionOpenState[sectionId];
  details.addEventListener("toggle", () => {
    marketSectionOpenState[sectionId] = details.open;
  });

  const summary = document.createElement("summary");
  summary.className = "market-subsection-head";

  const copy = document.createElement("div");
  copy.className = "market-subsection-copy";
  copy.innerHTML = `<h4>${title}</h4><p>${description}</p>`;

  const actions = document.createElement("div");
  actions.className = "market-section-actions";
  if (headerExtras) {
    actions.appendChild(headerExtras);
  }
  const toggle = document.createElement("span");
  toggle.className = "market-section-toggle";
  toggle.setAttribute("aria-hidden", "true");
  actions.appendChild(toggle);

  summary.append(copy, actions);
  bindSummaryControlEvents(summary);

  details.append(summary, buildBody());
  container.appendChild(details);
}

function appendMarketSection(
  container: HTMLElement,
  sectionId: MarketSectionId,
  title: string,
  description: string,
  headerExtras: HTMLElement | null,
  buildBody: () => HTMLElement
): void {
  const details = document.createElement("details");
  details.className = "market-section";
  details.open = marketSectionOpenState[sectionId];
  details.addEventListener("toggle", () => {
    marketSectionOpenState[sectionId] = details.open;
  });

  const summary = document.createElement("summary");
  summary.className = "market-section-head";

  const copy = document.createElement("div");
  copy.className = "market-section-copy";
  copy.innerHTML = `<h3>${title}</h3><p>${description}</p>`;

  const actions = document.createElement("div");
  actions.className = "market-section-actions";
  if (headerExtras) {
    actions.appendChild(headerExtras);
  }
  const toggle = document.createElement("span");
  toggle.className = "market-section-toggle";
  toggle.setAttribute("aria-hidden", "true");
  actions.appendChild(toggle);

  summary.append(copy, actions);
  bindSummaryControlEvents(summary);

  details.append(summary, buildBody());
  container.appendChild(details);
}

function bindSummaryControlEvents(summary: HTMLElement): void {
  summary.querySelectorAll(".batch-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });
}

function createBatchToggleGroup(section: BatchSection, activeBatch: BatchSize): HTMLElement {
  const group = document.createElement("div");
  group.className = "batch-toggle-group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", uiLabels.market.batchGroupLabel(section === "market" ? uiLabels.market.tradeTitle : uiLabels.market.craftTitle));
  group.innerHTML = BATCH_OPTIONS.map((batchSize) => `
    <button
      class="batch-toggle ${section === "market" ? "market-batch-toggle" : "craft-batch-toggle"} ${batchSize === activeBatch ? "active" : ""}"
      type="button"
      data-batch-section="${section}"
      data-batch-size="${batchSize}"
    >${uiLabels.market.batchLabel(batchSize)}</button>
  `).join("");
  return group;
}

function getBatchSizeFromButton(button: HTMLButtonElement, fallback: BatchSize): BatchSize {
  const parsed = Number.parseInt(button.dataset.batchSize ?? "", 10);
  return BATCH_OPTIONS.includes(parsed as BatchSize) ? parsed as BatchSize : fallback;
}
