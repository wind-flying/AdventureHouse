import {uiLabels} from "../../text/uiLabels";

export function getSaveTabMarkup(): string {
  return `
    <section class="tab-panel panel" data-panel="save" hidden>
      <div class="panel-head">
        <h2>${uiLabels.panels.saveTitle}</h2>
        <p>${uiLabels.panels.saveDescription}</p>
      </div>
      <div class="save-actions">
        <button id="export-save-btn" class="secondary-button" type="button">${uiLabels.saveControls.export}</button>
        <button id="import-save-btn" class="secondary-button" type="button">${uiLabels.saveControls.import}</button>
        <button id="reset-save-btn" class="secondary-button danger-button" type="button">${uiLabels.saveControls.reset}</button>
        <input id="import-save-input" type="file" accept="application/json,.json" hidden />
      </div>
    </section>
  `;
}
