import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';

import ValidationReport from './validation-report.js';

import type { Finding } from './validation/types.js';

customElements.define('oscd-validation-report', ValidationReport);

const findings: Finding[] = [
  {
    validatorId: 'schema',
    severity: 'error',
    message: "Element 'Header': missing attribute 'id'.",
    location: { line: 3 },
  },
  { validatorId: 'schema', severity: 'warning', message: 'No position.' },
];

describe('oscd-validation-report', () => {
  let report: ValidationReport;

  const separator = () =>
    report.shadowRoot!.querySelector<HTMLElement>('[role="separator"]')!;
  const height = () => Number(separator().getAttribute('aria-valuenow'));

  beforeEach(async () => {
    report = await fixture(html`
      <div style="height: 600px">
        <oscd-validation-report .findings=${findings}></oscd-validation-report>
      </div>
    `).then(
      host => host.querySelector<ValidationReport>('oscd-validation-report')!,
    );
  });

  it('lists findings, showing a line only when one is known', () => {
    const items = report.shadowRoot!.querySelectorAll('li');

    expect(items).to.have.length(2);
    expect(items[0].textContent).to.contain("missing attribute 'id'");
    expect(items[0].querySelector('.location')?.textContent).to.equal('line 3');
    expect(items[1].querySelector('.location')).to.equal(null);
  });

  it('selects a finding that has a location, and not one without', async () => {
    const buttons = report.shadowRoot!.querySelectorAll<HTMLElement>('.finding');
    expect(buttons).to.have.length(1);

    setTimeout(() => buttons[0].click());
    const event = await oneEvent(report, 'finding-select');

    expect(event.detail).to.equal(findings[0]);
  });

  it('shows the reason instead of findings when the run failed', async () => {
    report.failure = 'No bundled schema.';
    await report.updateComplete;

    expect(report.shadowRoot!.querySelector('li')).to.equal(null);
    expect(report.shadowRoot!.querySelector('[role="alert"]')?.textContent)
      .to.contain('No bundled schema.');
  });

  it('flags a report whose text has since changed', async () => {
    expect(report.shadowRoot!.querySelector('.stale')).to.equal(null);

    report.stale = true;
    await report.updateComplete;

    expect(report.shadowRoot!.querySelector('.stale')).to.not.equal(null);
  });

  it('asks to be closed', async () => {
    setTimeout(() =>
      report.shadowRoot!.querySelector<HTMLElement>('oscd-text-button')!.click(),
    );

    await oneEvent(report, 'close');
  });

  it('resizes from the keyboard within its bounds', async () => {
    const initial = height();
    separator().focus();

    await sendKeys({ press: 'ArrowUp' });
    await report.updateComplete;
    expect(height()).to.equal(initial + 16);

    await sendKeys({ press: 'Home' });
    await report.updateComplete;
    expect(height()).to.equal(96);

    await sendKeys({ press: 'End' });
    await report.updateComplete;
    expect(height()).to.equal(Number(separator().getAttribute('aria-valuemax')));
    expect(height()).to.be.lessThan(600);
  });

  it('resizes by dragging the separator', async () => {
    const initial = height();
    const init = { pointerId: 1, button: 0, bubbles: true };

    separator().dispatchEvent(
      new PointerEvent('pointerdown', { ...init, clientY: 300 }),
    );
    separator().dispatchEvent(
      new PointerEvent('pointermove', { ...init, clientY: 260 }),
    );
    separator().dispatchEvent(new PointerEvent('pointerup', init));
    separator().dispatchEvent(
      new PointerEvent('pointermove', { ...init, clientY: 100 }),
    );
    await report.updateComplete;

    expect(height()).to.equal(initial + 40);
  });
});
