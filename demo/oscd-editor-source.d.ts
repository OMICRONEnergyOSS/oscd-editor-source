import { LitElement, type PropertyValueMap } from 'lit';
import type * as AceGlobal from 'ace-builds';
import { EditV2, Transactor } from '@omicronenergy/oscd-api';
import 'ace-builds/src-noconflict/ace.js';
import 'ace-builds/src-noconflict/theme-sqlserver.js';
import 'ace-builds/src-noconflict/mode-xml.js';
import 'ace-builds/src-noconflict/ext-searchbox.js';
import AceEditor from 'ace-custom-element';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdOutlinedIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdOutlinedIconButton.js';
import { OscdOutlinedButton } from '@omicronenergy/oscd-ui/button/OscdOutlinedButton.js';
declare global {
    interface Window {
        ace: typeof AceGlobal;
    }
}
declare const OscdEditorSource_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export default class OscdEditorSource extends OscdEditorSource_base {
    static scopedElements: {
        'ace-editor': typeof AceEditor;
        'oscd-filled-button': typeof OscdFilledButton;
        'oscd-outlined-button': typeof OscdOutlinedButton;
        'oscd-outlined-icon-button': typeof OscdOutlinedIconButton;
        'oscd-icon': typeof OscdIcon;
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
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleAceChange;
    collapseAll(): void;
    expandAll(): void;
    formatXml(): void;
    applyChanges(): void;
    protected updated(changedProps: PropertyValueMap<OscdEditorSource>): void;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
