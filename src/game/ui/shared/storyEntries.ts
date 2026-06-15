import type {StoryEntry} from "../../core/types";

export function renderStoryEntries(
  target: HTMLDivElement | null,
  entries: StoryEntry[],
  emptyText: string
): void {
  if (!target) {
    return;
  }

  target.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = `log-entry ${entry.tone}`;
    item.innerHTML = buildStoryEntryMarkup(entry);
    target.appendChild(item);
  });
}

function buildStoryEntryMarkup(entry: StoryEntry): string {
  const variantClass = getStoryVariantClass(entry.badge);
  return `
    ${entry.badge ? `<span class="log-badge ${entry.tone} ${variantClass}">${entry.badge}</span>` : ""}
    <span class="log-text">${entry.text}</span>
  `;
}

function getStoryVariantClass(badge: StoryEntry["badge"]): string {
  switch (badge) {
    case "完成":
      return "story-complete";
    case "失手":
      return "story-failed";
    case "线索":
      return "story-lead";
    case "发现":
      return "story-discovery";
    case "后续":
      return "story-follow-up";
    case "出发":
      return "story-started";
    case "推进":
      return "story-progress";
    case "收益":
      return "story-income";
    default:
      return "";
  }
}
