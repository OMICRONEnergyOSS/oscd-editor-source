import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdOutlinedButton } from '@omicronenergy/oscd-ui/button/OscdOutlinedButton.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdCircularProgress } from '@omicronenergy/oscd-ui/progress/OscdCircularProgress.js';

export type ValidationSummary = 'clean' | 'findings' | 'failed';

export default class ValidationActions extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-outlined-button': OscdOutlinedButton,
    'oscd-text-button': OscdTextButton,
    'oscd-circular-progress': OscdCircularProgress,
  };

  @property({ type: Boolean })
  running = false;

  @property({ type: Boolean })
  disabled = false;

  /** Outcome of the latest run; leave undefined while it does not apply. */
  @property({ type: String })
  summary?: ValidationSummary;

  @property({ type: Number })
  findingCount = 0;

  private handleValidate(): void {
    this.dispatchEvent(
      new CustomEvent('validate', { bubbles: true, composed: true }),
    );
  }

  private handleToggleReport(): void {
    this.dispatchEvent(
      new CustomEvent('toggle-report', { bubbles: true, composed: true }),
    );
  }

  private renderSummary() {
    switch (this.summary) {
      case 'clean':
        return html`<span class="summary clean">✓ Valid</span>`;
      case 'findings':
        return html`<oscd-text-button
          class="summary error"
          @click=${this.handleToggleReport}
        >
          Errors: ${this.findingCount}
        </oscd-text-button>`;
      case 'failed':
        return html`<oscd-text-button
          class="summary error"
          @click=${this.handleToggleReport}
        >
          Validation failed
        </oscd-text-button>`;
      default:
        return nothing;
    }
  }

  render() {
    return html`
      <oscd-outlined-button
        ?disabled=${this.running || this.disabled}
        aria-busy=${this.running ? 'true' : 'false'}
        @click=${this.handleValidate}
      >
        ${this.running
          ? html`<oscd-circular-progress
              slot="icon"
              indeterminate
            ></oscd-circular-progress>`
          : nothing}
        Validate
      </oscd-outlined-button>
      <span class="status" role="status" aria-live="polite">
        ${this.renderSummary()}
      </span>
    `;
  }

  static styles = css`
    * {
      --md-circular-progress-size: 24px;
      --_error: var(--oscd-validation-error-color, #b3261e);
      --_success: var(--oscd-validation-success-color, #1b6d2f);
    }

    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .summary {
      font-family: var(
        --md-sys-typescale-label-large-font,
        var(--oscd-theme-text-font, sans-serif)
      );
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .clean {
      color: var(--_success);
    }

    .error {
      --md-text-button-label-text-color: var(--_error);
      --md-text-button-hover-label-text-color: var(--_error);
      --md-text-button-focus-label-text-color: var(--_error);
      --md-text-button-pressed-label-text-color: var(--_error);
    }
  `;
}
