import { LitElement, TemplateResult, html, css } from 'lit';
import { query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';

export type WarningDetail = {
  heading: string;
  message: string;
  onOk: () => void;
};

/** A dialog component for displaying warnings */
export class WarnDialog extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-dialog': OscdDialog,
    'oscd-filled-button': OscdFilledButton,
  };

  @state()
  private heading?: string = '';

  @state()
  private message?: string = '';

  @state()
  private onOk?: () => void;

  @query('oscd-dialog') dialog!: OscdDialog;

  public warning(details: WarningDetail) {
    this.heading = details.heading;
    this.message = details.message;
    this.onOk = details.onOk;
    this.dialog.show();
  }

  private close(): void {
    this.dialog.close();
    this.heading = '';
    this.message = '';
    this.onOk = undefined;
  }

  private handleOk(): void {
    if (this.onOk) {
      this.onOk();
    }
    this.close();
  }

  render(): TemplateResult {
    return html`
      <oscd-dialog @closed=${this.close}>
        <div slot="headline">${this.heading}</div>
        <div slot="content" class="dialog-content">
          <p>${this.message}</p>
        </div>
        <div slot="actions">
          <oscd-filled-button slot="primaryAction" @click=${this.handleOk}
            >OK</oscd-filled-button
          >
        </div>
      </oscd-dialog>
    `;
  }

  static styles = css`
    .dialog-content {
      margin-top: 16px;
    }
  `;
}
