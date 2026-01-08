import { LitElement, html, css, type PropertyValueMap } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { EditV2, Transactor } from '@omicronenergy/oscd-api';
import 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/theme-solarized_light';
import 'ace-builds/src-noconflict/mode-xml';
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

export default class OscdEditorText extends ScopedElementsMixin(LitElement) {
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

  // connectedCallback() {
  //   super.connectedCallback();
  //   this.dirty = false;
  //   if (this.doc) {
  //     const serializer = new XMLSerializer();
  //     this.xmlText = serializer.serializeToString(this.doc);
  //     this._initialXmlText = this.xmlText;
  //   }
  // }

  private handleAceChange(e: CustomEvent<string>): void {
    console.log('Ace Editor Change Event:', e);
    if (typeof e.detail !== 'string') {
      return;
    }
    this.xmlText = e.detail;
    this.dirty = this.xmlText !== this._initialXmlText;
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

  protected updated(changedProps: PropertyValueMap<OscdEditorText>): void {
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
    /* Anything rendered in here for a Menu plugin, will be hidden
     * Typically you would render dialogs here, where the run method
     * may set the dialogs state to open.
     */
    return html`
      <div>
        <h1>OSCD Raw XML Editor</h1>
        <oscd-filled-button
          ?disabled=${!this.dirty}
          @click=${() => this.applyChanges()}
        >
          Apply
        </oscd-filled-button>
      </div>
      <ace-editor
        mode="xml"
        theme="ace/theme/solarized_light"
        .value=${this.xmlText}
        @change=${(e: CustomEvent<string>) => this.handleAceChange(e)}
      ></ace-editor>
    `;
  }

  static styles = css`
    :host {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100vh;
      overflow: hidden;
    }

    :host > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
