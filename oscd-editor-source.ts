import { LitElement, html, css, type PropertyValueMap } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { EditV2, Transactor } from '@omicronenergy/oscd-api';
import 'ace-builds/src-noconflict/ace.js';
import 'ace-builds/src-noconflict/theme-sqlserver.js';
import 'ace-builds/src-noconflict/mode-xml.js';
import AceEditor from 'ace-custom-element';

import { newEditEventV2 } from '@omicronenergy/oscd-api/utils.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';

function parseXml(xml: string): XMLDocument {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(xml, 'application/xml');
  const parseError = parsed.querySelector('parsererror');
  if (parseError) {
    const error = new Error(parseError.textContent ?? 'Invalid XML');
    console.error('XML Parsing Error:', error);
  }
  return parsed;
}

export default class OscdEditorSource extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    /*
     * add any web-components this component will reference here.
     * E.g.
     * "oscd-button": OscdButton,
     *
     * Important!
     * Importing the web-component class should NOT result in the web-component being registered with the global customElements registry.
     * Otherwise it will fail to render at all. You'll only get an empty tag, no web component.
     */
    'ace-editor': AceEditor,
    'oscd-filled-button': OscdFilledButton,
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

  private dirty = false;

  @state()
  xmlText: string = '';

  _initialXmlText: string = '';

  @query('ace-editor')
  aceEditor!: AceEditor.default;

  private handleAceChange(e: CustomEvent<string>): void {
    console.log('Ace Editor Change Event:', e);
    if (typeof e.detail !== 'string') {
      return;
    }
    this.xmlText = e.detail;
    this.dirty = this.xmlText !== this._initialXmlText;
  }

  formatXml() {
    const rawXml = this.aceEditor.editor?.getSelectedText() || this.xmlText;
    if (!rawXml) {
      return;
    }

    // Trim leading and trailing whitespace to avoid injecting extra < or >
    const xml = rawXml.trim();

    let initialIndent = '';
    if (this.aceEditor.editor?.getSelectedText()) {
      const range = this.aceEditor.editor.getSelectionRange();
      // Get the starting line of the selection and detect its leading whitespace
      const startLine = range.start.row;
      const lineContent = this.aceEditor.editor.session.getLine(startLine);
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

    if (this.aceEditor.editor?.getSelectedText()) {
      const range = this.aceEditor.editor.getSelectionRange();
      // Remove the trailing \r\n
      this.aceEditor.editor.session.replace(
        range,
        formatted.substring(0, formatted.length - 2),
      );
    } else {
      this.xmlText = formatted;
    }
    this.dirty = true;
  }

  applyChanges() {
    if (!this.xmlText || !this.docName) {
      return;
    }

    let newDoc: XMLDocument;
    try {
      newDoc = parseXml(this.xmlText);
    } catch (error) {
      console.error('Failed to parse XML:', error);
      return;
    }
    if (this.doc?.documentElement) {
      this.dispatchEvent(
        newEditEventV2(
          [
            { node: this.doc?.documentElement },
            {
              node: newDoc?.documentElement,
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
      this._initialXmlText = this.xmlText;
    }
  }

  protected updated(changedProps: PropertyValueMap<OscdEditorSource>): void {
    if (changedProps.has('editCount') && this.doc) {
      const serializer = new XMLSerializer();
      const newText = serializer.serializeToString(this.doc);
      if (newText !== this.xmlText) {
        this.xmlText = newText;
      }
      this._initialXmlText = this.xmlText;
      this.dirty = false;
    }
  }

  render() {
    return html`
      <div>
        <oscd-filled-button @click=${() => this.formatXml()}>
          Format
        </oscd-filled-button>
        <oscd-filled-button
          ?disabled=${!this.dirty}
          @click=${() => this.applyChanges()}
        >
          Apply
        </oscd-filled-button>
      </div>
      <ace-editor
        mode="ace/mode/xml"
        theme="ace/theme/sqlserver"
        .value=${this.xmlText}
        @change=${(e: CustomEvent<string>) => this.handleAceChange(e)}
      ></ace-editor>
    `;
  }

  static styles = css`
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100%;
      overflow: hidden;
    }

    :host > div {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    :host > div > oscd-filled-button {
      flex-shrink: 0;
    }

    ace-editor {
      height: inherit;
      overflow: auto;
    }
  `;
}
