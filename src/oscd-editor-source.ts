import { LitElement, html, css, type PropertyValueMap } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdOutlinedIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdOutlinedIconButton.js';
import { OscdOutlinedButton } from '@omicronenergy/oscd-ui/button/OscdOutlinedButton.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';

import { WarnDialog } from './warn-dialog.js';

import type { EditV2, Transactor } from '@openscd/oscd-api';
import type { AceEditorWithSettingsMenu } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';

export default class OscdEditorSource extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-ace-editor': OscdAceEditor,
    'oscd-filled-button': OscdFilledButton,
    'oscd-outlined-button': OscdOutlinedButton,
    'oscd-outlined-icon-button': OscdOutlinedIconButton,
    'oscd-icon': OscdIcon,
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

  collapseAll() {
    if (!this.oscdAceEditor?.editor) {
      return;
    }
    // Fold all except the root element (line 0)
    this.oscdAceEditor.editor.session.foldAll(1);
  }

  expandAll() {
    if (!this.oscdAceEditor?.editor) {
      return;
    }
    this.oscdAceEditor.editor.session.unfold();
  }

  formatXml() {
    const rawXml = this.oscdAceEditor.editor?.getSelectedText() || this.xmlText;
    if (!rawXml) {
      return;
    }

    // Trim leading and trailing whitespace to avoid injecting extra < or >
    const xml = rawXml.trim();

    let initialIndent = '';
    if (this.oscdAceEditor.editor?.getSelectedText()) {
      const range = this.oscdAceEditor.editor.getSelectionRange();
      // Get the starting line of the selection and detect its leading whitespace
      const startLine = range.start.row;
      const lineContent = this.oscdAceEditor.editor.session.getLine(startLine);
      initialIndent = lineContent.match(/^(\s*)/)?.[1] || '';
    }

    let formatted = '';
    let indent = '';

    const tab = '\t';
    const nodes = xml.split(/>\s*</);
    nodes.forEach(function (node, index) {
      // Remove leading < from first node and trailing > from last node. Allow for selection leading or trailing whitespace.
      if (index === 0) {
        node = node.replace(/^\s*</, '');
      }
      if (index === nodes.length - 1) {
        node = node.replace(/>\s*$/, '');
      }

      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab!.length);
      }
      formatted += initialIndent + indent + '<' + node + '>\r\n';
      if (node.match(/^<?\w[^>]*[^/]$/)) {
        indent += tab;
      }
    });

    if (this.oscdAceEditor.editor?.getSelectedText()) {
      const range = this.oscdAceEditor.editor.getSelectionRange();
      // Remove the trailing \r\n
      this.oscdAceEditor.editor.session.replace(
        range,
        formatted.substring(0, formatted.length - 2),
      );
    } else {
      this.xmlText = formatted;
    }
    this.dirty = true;
  }

  openSettings() {
    const editor: AceEditorWithSettingsMenu | undefined =
      this.oscdAceEditor?.editor;
    if (!editor) {
      return;
    }
    editor.showSettingsMenu?.();
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
      <div class="toolbar">
        <div class="actions">
          <oscd-outlined-icon-button
            @click=${() => this.oscdAceEditor?.editor?.session.foldAll(1)}
          >
            <oscd-icon>collapse_all</oscd-icon>
          </oscd-outlined-icon-button>
          <oscd-outlined-icon-button
            @click=${() => this.oscdAceEditor?.editor?.session.unfold()}
          >
            <oscd-icon>expand_all</oscd-icon>
          </oscd-outlined-icon-button>
          <oscd-outlined-icon-button
            @click=${() => this.oscdAceEditor.editor?.execCommand('find')}
          >
            <oscd-icon>search</oscd-icon>
          </oscd-outlined-icon-button>
          <oscd-outlined-button @click=${() => this.formatXml()}>
            Format
          </oscd-outlined-button>
          <oscd-outlined-icon-button @click=${() => this.openSettings()}>
            <oscd-icon>settings</oscd-icon>
          </oscd-outlined-icon-button>
        </div>

        <oscd-filled-button
          ?disabled=${!this.dirty}
          @click=${() => this.applyChanges()}
        >
          Apply
        </oscd-filled-button>
      </div>
      <oscd-ace-editor
        .value=${this.xmlText}
        @change=${this.handleAceChange}
      ></oscd-ace-editor>
      <warn-dialog> </warn-dialog>
    `;
  }

  static styles = css`
    :host {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    :host > div > oscd-filled-button {
      flex-shrink: 0;
    }

    oscd-ace-editor {
      min-height: 0;
    }
  `;
}
