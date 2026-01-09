import { LitElement, type PropertyValueMap } from 'lit';
import { EditV2, Transactor } from '@omicronenergy/oscd-api';
import 'ace-builds/src-noconflict/ace.js';
import 'ace-builds/src-noconflict/theme-sqlserver.js';
import 'ace-builds/src-noconflict/mode-xml.js';
import AceEditor from 'ace-custom-element';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
declare const OscdEditorSource_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export default class OscdEditorSource extends OscdEditorSource_base {
    static scopedElements: {
        'ace-editor': typeof AceEditor;
        'oscd-filled-button': typeof OscdFilledButton;
    };
    editor: Transactor<EditV2>;
    docs: Record<string, XMLDocument>;
    doc?: XMLDocument;
    docName?: string;
    docVersion?: unknown;
    locale?: string;
    editCount: number;
    private dirty;
    xmlText: string;
    _initialXmlText: string;
    aceEditor: AceEditor.default;
    private handleAceChange;
    formatXml(): void;
    applyChanges(): void;
    protected updated(changedProps: PropertyValueMap<OscdEditorSource>): void;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
