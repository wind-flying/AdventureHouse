import type {Elements, GameData} from "../../core/types";
import {uiLabels} from "../../text/uiLabels";
import {getIntelItemViewModel, type IntelItemViewModel} from "../viewModels";

export function getIntelTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="intel" hidden>
      <div class="panel-head"><h2>${uiLabels.panels.intelTitle}</h2><p>${uiLabels.panels.intelDescription}</p></div>
      <div id="intel-list" class="intel-board"></div>
    </section>
  `;
}

export function renderIntelTab(gameData: GameData, elements: Elements): void {
  if (!elements.intelList) {
    return;
  }

  const leadMarkup = gameData.player.leads.length > 0
    ? gameData.player.leads.map((record) => buildIntelItemMarkup(getIntelItemViewModel(gameData, record))).join("")
    : `<p class="empty-state">${uiLabels.intelBoard.emptyLeads}</p>`;
  const discoveryMarkup = gameData.player.discoveries.length > 0
    ? gameData.player.discoveries.map((record) => buildIntelItemMarkup(getIntelItemViewModel(gameData, record))).join("")
    : `<p class="empty-state">${uiLabels.intelBoard.emptyDiscoveries}</p>`;

  elements.intelList.innerHTML = `
    <section class="panel inset-panel intel-section">
      <div class="panel-head"><h3>${uiLabels.intelBoard.leadsTitle}</h3><p>${uiLabels.intelBoard.leadsDescription}</p></div>
      <div class="log-list compact-list">${leadMarkup}</div>
    </section>
    <section class="panel inset-panel intel-section">
      <div class="panel-head"><h3>${uiLabels.intelBoard.discoveriesTitle}</h3><p>${uiLabels.intelBoard.discoveriesDescription}</p></div>
      <div class="log-list compact-list">${discoveryMarkup}</div>
    </section>
  `;
}

function buildIntelItemMarkup(item: IntelItemViewModel): string {
  return `
    <article class="intel-item">
      <div class="quest-head">
        <span class="log-badge reward">${item.badgeText}</span>
        <span class="intel-status ${item.statusClass}">${uiLabels.intelBoard.status}：${item.statusText}</span>
        <span class="story-day">${item.dayText}</span>
      </div>
      <strong class="mini-title">${item.titleText}</strong>
      <p class="quest-body">${item.summaryText}</p>
      ${item.lineText ? `<div class="adventurer-meta">${item.lineText}</div>` : ""}
      <div class="adventurer-meta">${item.sourceText}</div>
      <div class="adventurer-meta">${item.methodText}</div>
    </article>
  `;
}
