import {uiLabels} from "../../text/uiLabels";

export function getReliefTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="relief" hidden>
      <div class="panel-head">
        <h2>${uiLabels.panels.reliefTitle}</h2>
        <p>${uiLabels.panels.reliefDescription}</p>
      </div>
      <div class="relief-stack">
        <section class="panel inset-panel">
          <div class="panel-head">
            <h3>${uiLabels.panels.stockTitle}</h3>
            <p>${uiLabels.panels.stockDescription}</p>
          </div>
          <div id="stock-list" class="stock-list"></div>
        </section>
        <section class="panel inset-panel">
          <div class="panel-head">
            <h3>${uiLabels.panels.marketTitle}</h3>
            <p>${uiLabels.panels.marketDescription}</p>
          </div>
          <div id="market-list" class="market-list"></div>
        </section>
      </div>
    </section>
  `;
}
