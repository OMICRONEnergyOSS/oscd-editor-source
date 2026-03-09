import { LitElement, TemplateResult } from 'lit';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
export type WarningDetail = {
    heading: string;
    message: string;
    onOk: () => void;
};
declare const WarnDialog_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
/** A dialog component for displaying warnings */
export declare class WarnDialog extends WarnDialog_base {
    static scopedElements: {
        'oscd-dialog': typeof OscdDialog;
        'oscd-filled-button': typeof OscdFilledButton;
    };
    private heading?;
    private message?;
    private onOk?;
    dialog: OscdDialog;
    warning(details: WarningDetail): void;
    private close;
    private handleOk;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
