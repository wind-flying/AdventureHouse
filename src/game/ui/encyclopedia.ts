import encyclopediaConfigData from "../../../config/encyclopedia.json";
import type {Elements, EncyclopediaUnlockCondition, GameData} from "../core/types";
import {encyclopediaText, type EncyclopediaEntryText} from "../text/encyclopediaText";

interface EncyclopediaCategoryConfig {
  id: string;
  textId: keyof typeof encyclopediaText.categories;
}

interface EncyclopediaEntryConfig {
  id: string;
  categoryId: string;
  textId: keyof typeof encyclopediaText.entries;
  unlockConditions: EncyclopediaUnlockCondition[];
}

interface EncyclopediaConfig {
  categories: EncyclopediaCategoryConfig[];
  entries: EncyclopediaEntryConfig[];
}

interface EncyclopediaFacts {
  hasPublishedQuest: boolean;
  hasGiftedAdventurerItem: boolean;
}

const READ_ENTRY_STORAGE_KEY = "adventure-house:encyclopedia-read-entries";
const encyclopediaConfig = encyclopediaConfigData as EncyclopediaConfig;
let fallbackReadEntryIds = new Set<string>();

export function getEncyclopediaMarkup(): string {
  return `
    <div id="encyclopedia-modal" class="encyclopedia-overlay" role="dialog" aria-modal="true"
      aria-labelledby="encyclopedia-title" hidden>
      <section class="encyclopedia-dialog">
        <header class="encyclopedia-header">
          <h2 id="encyclopedia-title">${encyclopediaText.title}</h2>
        </header>
        <div class="encyclopedia-body">
          <nav id="encyclopedia-navigation" class="encyclopedia-navigation"
            aria-label="${encyclopediaText.title}"></nav>
          <article id="encyclopedia-content" class="encyclopedia-content"></article>
        </div>
        <footer class="encyclopedia-footer">
          <button id="encyclopedia-close-btn" class="secondary-button" type="button">
            ${encyclopediaText.close}
          </button>
        </footer>
      </section>
    </div>
  `;
}

export function renderEncyclopedia(gameData: GameData, elements: Elements): void {
  const unlockedEntries = getUnlockedEncyclopediaEntries(gameData);
  const readEntryIds = loadReadEntryIds();
  const hasUnreadEntries = unlockedEntries.some((entry) => !readEntryIds.has(entry.id));

  if (elements.encyclopediaButton) {
    elements.encyclopediaButton.classList.toggle("has-new-entry", hasUnreadEntries);
    elements.encyclopediaButton.setAttribute("aria-label", hasUnreadEntries
      ? `${encyclopediaText.triggerLabel}，${encyclopediaText.newEntryHint}`
      : encyclopediaText.triggerLabel);
    elements.encyclopediaButton.title = hasUnreadEntries
      ? encyclopediaText.newEntryHint
      : encyclopediaText.triggerLabel;
  }

  if (elements.encyclopediaModal?.hidden === false) {
    renderOpenEncyclopedia(unlockedEntries, elements);
  }
}

export function openEncyclopedia(gameData: GameData, elements: Elements): void {
  if (!elements.encyclopediaModal) {
    return;
  }

  const unlockedEntries = getUnlockedEncyclopediaEntries(gameData);
  markEntriesAsRead(unlockedEntries.map((entry) => entry.id));
  elements.encyclopediaModal.hidden = false;
  renderOpenEncyclopedia(unlockedEntries, elements);
  renderEncyclopedia(gameData, elements);
  elements.encyclopediaCloseBtn?.focus();
}

export function closeEncyclopedia(elements: Elements): void {
  if (!elements.encyclopediaModal || elements.encyclopediaModal.hidden) {
    return;
  }

  elements.encyclopediaModal.hidden = true;
  elements.encyclopediaButton?.focus();
}

export function selectEncyclopediaEntry(
  gameData: GameData,
  elements: Elements,
  categoryId: string
): void {
  const unlockedEntries = getUnlockedEncyclopediaEntries(gameData);
  if (!unlockedEntries.some((entry) => entry.categoryId === categoryId)) {
    return;
  }

  if (elements.encyclopediaModal) {
    elements.encyclopediaModal.dataset.selectedCategoryId = categoryId;
  }
  renderOpenEncyclopedia(unlockedEntries, elements);
}

function getUnlockedEncyclopediaEntries(gameData: GameData): EncyclopediaEntryConfig[] {
  const facts = getEncyclopediaFacts(gameData);
  return encyclopediaConfig.entries.filter((entry) =>
    entry.unlockConditions.every((condition) => isUnlockConditionMet(condition, facts))
  );
}

function getEncyclopediaFacts(gameData: GameData): EncyclopediaFacts {
  return {
    hasPublishedQuest: gameData.player.quests.length > 0,
    hasGiftedAdventurerItem: gameData.player.hasGiftedAdventurerItem
  };
}

function isUnlockConditionMet(
  condition: EncyclopediaUnlockCondition,
  facts: EncyclopediaFacts
): boolean {
  switch (condition.type) {
    case "firstQuestPublished":
      return facts.hasPublishedQuest;
    case "firstAdventurerItemGifted":
      return facts.hasGiftedAdventurerItem;
  }
}

function renderOpenEncyclopedia(
  unlockedEntries: EncyclopediaEntryConfig[],
  elements: Elements
): void {
  const navigation = elements.encyclopediaNavigation;
  const content = elements.encyclopediaContent;
  if (!navigation || !content) {
    return;
  }

  if (unlockedEntries.length === 0) {
    navigation.innerHTML = "";
    content.innerHTML = `
      <div class="encyclopedia-empty">
        <h3>${encyclopediaText.emptyTitle}</h3>
        <p>${encyclopediaText.emptyDescription}</p>
      </div>
    `;
    delete elements.encyclopediaModal?.dataset.selectedCategoryId;
    return;
  }

  const selectedCategoryId = getSelectedCategoryId(unlockedEntries, elements);
  const visibleCategories = encyclopediaConfig.categories.filter((category) =>
    unlockedEntries.some((entry) => entry.categoryId === category.id)
  );

  navigation.innerHTML = visibleCategories.map((category) => {
    const categoryEntries = unlockedEntries.filter((entry) => entry.categoryId === category.id);
    const activeClass = category.id === selectedCategoryId ? " active" : "";
    return `
      <section class="encyclopedia-category">
        <button class="encyclopedia-category-button${activeClass}" type="button"
          data-encyclopedia-category-id="${category.id}">
          ${encyclopediaText.categories[category.textId]}
          <span>${categoryEntries.length}</span>
        </button>
      </section>
    `;
  }).join("");

  const selectedCategory = visibleCategories.find((category) => category.id === selectedCategoryId)
    ?? visibleCategories[0];
  const selectedEntries = unlockedEntries.filter((entry) => entry.categoryId === selectedCategory.id);
  renderCategoryContent(selectedCategory, selectedEntries, content);
}

function getSelectedCategoryId(
  unlockedEntries: EncyclopediaEntryConfig[],
  elements: Elements
): string {
  const currentCategoryId = elements.encyclopediaModal?.dataset.selectedCategoryId;
  const selectedCategoryId = unlockedEntries.some((entry) => entry.categoryId === currentCategoryId)
    ? currentCategoryId ?? unlockedEntries[0].categoryId
    : unlockedEntries[0].categoryId;

  if (elements.encyclopediaModal) {
    elements.encyclopediaModal.dataset.selectedCategoryId = selectedCategoryId;
  }
  return selectedCategoryId;
}

function renderCategoryContent(
  category: EncyclopediaCategoryConfig,
  entries: EncyclopediaEntryConfig[],
  content: HTMLElement
): void {
  content.innerHTML = `
    <h3>${encyclopediaText.categories[category.textId]}</h3>
    ${entries.map((entry) => renderEntrySection(encyclopediaText.entries[entry.textId])).join("")}
  `;
}

function renderEntrySection(text: EncyclopediaEntryText): string {
  return `
    <section class="encyclopedia-entry-section">
      <h4>${text.title}</h4>
      ${text.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </section>
  `;
}

function loadReadEntryIds(): Set<string> {
  try {
    const rawValue = window.localStorage.getItem(READ_ENTRY_STORAGE_KEY);
    if (!rawValue) {
      return new Set(fallbackReadEntryIds);
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return new Set(fallbackReadEntryIds);
    }

    const storedIds = parsedValue.filter((value): value is string => typeof value === "string");
    fallbackReadEntryIds = new Set(storedIds);
  } catch {
    // Storage policies may reject localStorage access.
  }

  return new Set(fallbackReadEntryIds);
}

function markEntriesAsRead(entryIds: string[]): void {
  const nextReadEntryIds = loadReadEntryIds();
  entryIds.forEach((entryId) => nextReadEntryIds.add(entryId));
  fallbackReadEntryIds = nextReadEntryIds;

  try {
    window.localStorage.setItem(READ_ENTRY_STORAGE_KEY, JSON.stringify([...nextReadEntryIds]));
  } catch {
    // The in-memory set still prevents repeated notices for the current session.
  }
}
