import { LitElement, html, css, type PropertyValueMap } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';

import { WarnDialog } from './warn-dialog.js';

import type { EditV2, Transactor } from '@openscd/oscd-api';

export default class OscdEditorSource extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-ace-editor': OscdAceEditor,
    'oscd-filled-button': OscdFilledButton,
    'warn-dialog': WarnDialog,
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

  private initialXmlText = '';

  @query('oscd-ace-editor')
  oscdAceEditor!: OscdAceEditor;

  @query('warn-dialog')
  warnDialog!: WarnDialog;

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

  render() {
    return html`
      <oscd-ace-editor
        .value=${this.xmlText}
        .toolbar=${true}
        @change=${this.handleAceChange}
      >
        <oscd-filled-button
          slot="toolbar-actions"
          ?disabled=${!this.dirty}
          @click=${() => this.applyChanges()}
        >
          Apply
        </oscd-filled-button>
      </oscd-ace-editor>
      <warn-dialog> </warn-dialog>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    oscd-ace-editor {
      height: 100%;
      min-height: 0;
    }
  `;
}
