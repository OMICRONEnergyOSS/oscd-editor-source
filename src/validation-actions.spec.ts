import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import ValidationActions from './validation-actions.js';

customElements.define('oscd-validation-actions', ValidationActions);

describe('oscd-validation-actions', () => {
  let actions: ValidationActions;

  const button = () =>
    actions.shadowRoot!.querySelector<HTMLElement & { disabled: boolean }>(
      'oscd-outlined-button',
    )!;
  const status = () =>
    actions.shadowRoot!.querySelector('.status')!.textContent!.trim();

  beforeEach(async () => {
    actions = await fixture(html`<oscd-validation-actions></oscd-validation-actions>`);
  });

  it('requests validation from the Validate button', async () => {
    setTimeout(() => button().click());

    await oneEvent(actions, 'validate');
  });

  it('shows a busy, disabled button while running', async () => {
    actions.running = true;
    await actions.updateComplete;

    expect(button().disabled).to.equal(true);
    expect(button().getAttribute('aria-busy')).to.equal('true');
    expect(button().querySelector('oscd-circular-progress')).to.not.equal(null);
  });

  it('summarizes the latest run', async () => {
    expect(status()).to.equal('');

    actions.summary = 'clean';
    await actions.updateComplete;
    expect(status()).to.equal('✓ Valid');

    actions.summary = 'findings';
    actions.findingCount = 3;
    await actions.updateComplete;
    expect(status()).to.equal('Errors: 3');

    actions.summary = 'failed';
    await actions.updateComplete;
    expect(status()).to.equal('Validation failed');
  });

  it('toggles the report from the error summary', async () => {
    actions.summary = 'findings';
    actions.findingCount = 1;
    await actions.updateComplete;
    const summary = actions.shadowRoot!.querySelector<HTMLElement>('.summary')!;
    setTimeout(() => summary.click());

    await oneEvent(actions, 'toggle-report');
  });
});
