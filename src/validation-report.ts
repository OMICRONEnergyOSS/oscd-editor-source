import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';

import type { Finding } from './validation/types.js';

const MIN_HEIGHT = 96;
const MIN_SIBLING_HEIGHT = 128;
const KEY_STEP = 16;

export default class ValidationReport extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-text-button': OscdTextButton,
  };

  @property({ attribute: false })
  findings: Finding[] = [];

  /** Set when the run could not complete; shown instead of findings. */
  @property({ type: String })
  failure?: string;

  /** The text has changed since this report was produced. */
  @property({ type: Boolean })
  stale = false;

  @state()
  private height = 200;

  private dragStart?: { pointerY: number; height: number };

  private handleClose(): void {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    );
  }

  private handleSelectFinding(finding: Finding): void {
    this.dispatchEvent(
      new CustomEvent<Finding>('finding-select', {
        detail: finding,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleSplitterPointerDown(e: PointerEvent): void {
    if (e.button !== 0 || !(e.currentTarget instanceof HTMLElement)) {
      return;
    }
    this.dragStart = { pointerY: e.clientY, height: this.height };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture only keeps the drag alive outside the separator; not every pointer source supports it.
    }
  }

  private handleSplitterPointerMove(e: PointerEvent): void {
    if (this.dragStart === undefined) {
      return;
    }
    this.setHeight(this.dragStart.height + this.dragStart.pointerY - e.clientY);
  }

  private handleSplitterPointerEnd(): void {
    this.dragStart = undefined;
  }

  private handleSplitterKeyDown(e: KeyboardEvent): void {
    const steps: Record<string, () => void> = {
      ArrowUp: () => this.setHeight(this.height + KEY_STEP),
      ArrowDown: () => this.setHeight(this.height - KEY_STEP),
      Home: () => this.setHeight(MIN_HEIGHT),
      End: () => this.setHeight(this.maxHeight),
    };
    const step = steps[e.key];
    if (step === undefined) {
      return;
    }
    e.preventDefault();
    step();
  }

  private get maxHeight(): number {
    const root = this.getRootNode();
    const container =
      root instanceof ShadowRoot ? root.host : this.parentElement;
    const available = container?.clientHeight ?? window.innerHeight;
    return Math.max(MIN_HEIGHT, available - MIN_SIBLING_HEIGHT);
  }

  private setHeight(height: number): void {
    this.height = Math.min(this.maxHeight, Math.max(MIN_HEIGHT, height));
  }

  private renderFinding(finding: Finding) {
    const { location } = finding;
    if (location === undefined) {
      return html`<li class=${finding.severity}>
        <span class="message">${finding.message}</span>
      </li>`;
    }
    return html`<li class=${finding.severity}>
      <button
        type="button"
        class="finding"
        aria-label="${finding.message} (go to line ${location.line})"
        @click=${() => this.handleSelectFinding(finding)}
      >
        <span class="message">${finding.message}</span>
        <span class="location">line ${location.line}</span>
      </button>
    </li>`;
  }

  private renderBody() {
    if (this.failure !== undefined) {
      return html`<p class="failure" role="alert">
        Validation could not complete: ${this.failure}
      </p>`;
    }
    return html`<ul>
      ${this.findings.map(finding => this.renderFinding(finding))}
    </ul>`;
  }

  render() {
    return html`
      <div
        class="separator"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize validation report"
        aria-valuemin=${MIN_HEIGHT}
        aria-valuemax=${this.maxHeight}
        aria-valuenow=${this.height}
        tabindex="0"
        @pointerdown=${this.handleSplitterPointerDown}
        @pointermove=${this.handleSplitterPointerMove}
        @pointerup=${this.handleSplitterPointerEnd}
        @pointercancel=${this.handleSplitterPointerEnd}
        @keydown=${this.handleSplitterKeyDown}
      ></div>
      <section style="height: ${this.height}px" aria-label="Validation report">
        <header>
          <h2>
            ${this.failure !== undefined
              ? 'Validation failed'
              : `Errors: ${this.findings.length}`}
          </h2>
          ${this.stale
            ? html`<span class="stale"
                >Text changed since this run; positions may be off.</span
              >`
            : nothing}
          <oscd-text-button @click=${this.handleClose}>Close</oscd-text-button>
        </header>
        ${this.renderBody()}
      </section>
    `;
  }

  static styles = css`
    * {
      --_border: var(--md-sys-color-outline-variant, #c4c7c5);
      --_error: var(--oscd-validation-error-color, #b3261e);
    }

    :host {
      display: block;
      flex: none;
      background: var(--md-sys-color-surface, #fff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-family: var(--oscd-theme-text-font, sans-serif);
    }

    .separator {
      height: 6px;
      cursor: row-resize;
      border-top: 1px solid var(--_border);
      background: var(--md-sys-color-surface-container, #f3edf7);
      touch-action: none;
    }

    .separator:hover,
    .separator:focus-visible {
      background: var(--md-sys-color-primary, #6750a4);
      outline: none;
    }

    section {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 8px 0 16px;
      border-bottom: 1px solid var(--_border);
    }

    h2 {
      flex: none;
      margin: 0;
      font: inherit;
      font-weight: 500;
    }

    .stale {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.7;
    }

    oscd-text-button {
      margin-left: auto;
    }

    ul {
      flex: 1;
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;
    }

    li {
      display: flex;
      padding: 6px 16px;
      border-bottom: 1px solid var(--_border);
      font-family: monospace;
      font-size: 0.85rem;
      user-select: text;
    }

    li > .message {
      flex: 1;
    }

    .finding {
      display: flex;
      flex: 1;
      gap: 12px;
      margin: 0;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .finding:hover,
    .finding:focus-visible {
      color: var(--md-sys-color-primary, #6750a4);
    }

    li.error {
      border-left: 3px solid var(--_error);
    }

    li.warning {
      border-left: 3px solid #b26a00;
    }

    .message {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .location {
      flex: none;
      opacity: 0.7;
    }

    .failure {
      margin: 0;
      padding: 12px 16px;
      color: var(--_error);
    }
  `;
}
