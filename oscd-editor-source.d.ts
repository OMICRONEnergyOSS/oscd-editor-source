import { LitElement, type PropertyValueMap } from 'lit';
import type * as AceGlobal from 'ace-builds';
import { EditV2, Transactor } from '@openscd/oscd-api';
import AceEditor from 'ace-custom-element';
import 'ace-custom-element/dist/ace/mode-xml.js';
import 'ace-custom-element/dist/ace/ext-searchbox.js';
import 'ace-custom-element/dist/ace/ext-themelist.js';
import './ace-theme-oscd.js';
import 'ace-custom-element/dist/ace/ext-settings_menu.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdOutlinedIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdOutlinedIconButton.js';
import { OscdOutlinedButton } from '@omicronenergy/oscd-ui/button/OscdOutlinedButton.js';
import { WarnDialog } from './warn-dialog.js';
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
        'warn-dialog': typeof WarnDialog;
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
    aceEditor: AceEditor;
    warnDialog: WarnDialog;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleAceChange;
    collapseAll(): void;
    expandAll(): void;
    formatXml(): void;
    openSettings(): void;
    applyChanges(): void;
    protected updated(changedProps: PropertyValueMap<OscdEditorSource>): void;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
