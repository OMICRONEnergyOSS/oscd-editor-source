import { LitElement, html, css, nothing, type PropertyValueMap } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';
import { OscdWarnDialog } from '@omicronenergy/oscd-ui/dialog/warning/OscdWarnDialog.js';

import ValidationActions from './validation-actions.js';
import ValidationReport from './validation-report.js';
import { validateSchema } from './validation/schema/schema-validator.js';

import type { EditV2, Transactor } from '@openscd/oscd-api';
import type { ValidationSummary } from './validation-actions.js';
import type { Finding, ValidationOutcome } from './validation/types.js';

interface ValidationRun {
  /** Editor text the outcome belongs to. */
  text: string;
  outcome: ValidationOutcome;
}

export default class OscdEditorSource extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-ace-editor': OscdAceEditor,
    'oscd-filled-button': OscdFilledButton,
    'oscd-warn-dialog': OscdWarnDialog,
    'oscd-validation-actions': ValidationActions,
    'oscd-validation-report': ValidationReport,
  };

  @property({ type: Object })
  editor!: Transactor<EditV2>;

  @property({ type: Object })
  docs!: Record<string, XMLDocument>;

  @property({ type: Object })
  doc?: XMLDocument;

  @property({ type: String })
  docName?: string;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  locale?: string;

  @property({ type: Number })
  editCount = -1;

  @state()
  xmlText: string = '';

  @state()
  private dirty = false;

  @state()
  private validating = false;

  @state()
  private lastRun?: ValidationRun;

  @state()
  private reportOpen = false;

  private initialXmlText = '';

  @query('oscd-ace-editor')
  oscdAceEditor!: OscdAceEditor;

  @query('oscd-warn-dialog')
  warnDialog!: OscdWarnDialog;

  protected willUpdate(changedProps: PropertyValueMap<OscdEditorSource>): void {
    if (
      changedProps.has('doc') ||
      changedProps.has('docName') ||
      changedProps.has('docVersion') ||
      changedProps.has('editCount')
    ) {
      this.xmlText = this.doc
        ? new XMLSerializer().serializeToString(this.doc)
        : '';
      this.initialXmlText = this.xmlText;
      this.dirty = false;
    }
  }

  private handleAceChange(e: CustomEvent<string>): void {
    if (typeof e.detail !== 'string') {
      return;
    }
    this.xmlText = e.detail;
    this.dirty = this.xmlText !== this.initialXmlText;
  }

  private async handleValidate(): Promise<void> {
    if (this.validating) {
      return;
    }

    const text = this.xmlText;
    this.validating = true;
    const outcome = await validateSchema(text);
    this.validating = false;

    this.lastRun = { text, outcome };
    // Findings and failures need attention; a clean run clears the panel.
    this.reportOpen =
      outcome.status === 'failed' || outcome.findings.length > 0;
  }

  private handleToggleReport(): void {
    this.reportOpen = !this.reportOpen;
  }

  private handleCloseReport(): void {
    this.reportOpen = false;
  }

  private handleSelectFinding(e: CustomEvent<Finding>): void {
    const editor = this.oscdAceEditor?.editor;
    const location = e.detail.location;
    if (editor === undefined || location === undefined) {
      return;
    }
    editor.gotoLine(location.line, Math.max(0, (location.column ?? 1) - 1), true);
    editor.focus();
  }

  applyChanges() {
    if (!this.xmlText || !this.docName) {
      return;
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(this.xmlText, 'application/xml');
    const parseError = parsed.querySelector('parsererror');
    if (parseError) {
      const errorMsg =
        parseError.querySelector('div')?.textContent ||
        'Unknown XML parsing error';

      this.warnDialog?.warning({
        heading: 'Invalid XML',
        message: errorMsg,
        onOk: () => {},
      });
      return;
    }

    if (this.doc?.documentElement) {
      this.dispatchEvent(
        newEditEventV2(
          [
            { node: this.doc?.documentElement },
            {
              node: parsed?.documentElement,
              parent: this.doc,
              reference: null,
            },
          ],
          {
            title: 'XML Text Edit',
            squash: true,
          },
        ),
      );
      this.dirty = false;
      this.initialXmlText = this.xmlText;
    }
  }

  private get validationSummary(): ValidationSummary | undefined {
    const outcome = this.lastRun?.outcome;
    if (outcome === undefined) {
      return undefined;
    }
    if (outcome.status === 'failed') {
      return 'failed';
    }
    if (outcome.findings.length > 0) {
      return 'findings';
    }
    // A clean result only describes the text that was validated.
    return this.lastRun?.text === this.xmlText ? 'clean' : undefined;
  }

  private renderReport() {
    const outcome = this.lastRun?.outcome;
    if (!this.reportOpen || outcome === undefined) {
      return nothing;
    }
    return html`<oscd-validation-report
      .findings=${outcome.status === 'completed' ? outcome.findings : []}
      .failure=${outcome.status === 'failed' ? outcome.reason : undefined}
      .stale=${this.lastRun?.text !== this.xmlText}
      @close=${this.handleCloseReport}
      @finding-select=${this.handleSelectFinding}
    ></oscd-validation-report>`;
  }

  render() {
    const outcome = this.lastRun?.outcome;
    return html`
      <oscd-ace-editor
        .value=${this.xmlText}
        .toolbar=${true}
        @change=${this.handleAceChange}
      >
        <div slot="toolbar-actions" class="toolbar-actions">
          <oscd-validation-actions
            .running=${this.validating}
            .disabled=${this.xmlText === ''}
            .summary=${this.validationSummary}
            .findingCount=${outcome?.status === 'completed'
              ? outcome.findings.length
              : 0}
            @validate=${this.handleValidate}
            @toggle-report=${this.handleToggleReport}
          ></oscd-validation-actions>
          <oscd-filled-button
            ?disabled=${!this.dirty}
            @click=${() => this.applyChanges()}
          >
            Apply
          </oscd-filled-button>
        </div>
      </oscd-ace-editor>
      ${this.renderReport()}
      <oscd-warn-dialog></oscd-warn-dialog>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    oscd-ace-editor {
      flex: 1 1 0;
      min-height: 0;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  `;
}
