import { expect } from '@open-wc/testing';

import { validateSchema } from './schema-validator.js';

const NS = 'xmlns="http://www.iec.ch/61850/2003/SCL"';
const valid = `<?xml version="1.0" encoding="UTF-8"?>
<SCL ${NS} version="2007" revision="B" release="4">
  <Header id="valid"/>
</SCL>`;

describe('validateSchema', () => {
  it('completes without findings for a schema-valid document', async () => {
    expect(await validateSchema(valid)).to.deep.equal({
      status: 'completed',
      findings: [],
    });
  });

  it('reports schema violations with the engine position', async () => {
    const outcome = await validateSchema(
      valid.replace('<Header id="valid"/>', '<Header/>'),
    );

    expect(outcome.status).to.equal('completed');
    if (outcome.status !== 'completed') {
      return;
    }
    expect(outcome.findings).to.not.be.empty;
    const [first] = outcome.findings;
    expect(first.validatorId).to.equal('schema');
    expect(first.severity).to.equal('error');
    expect(first.message).to.contain('id');
    expect(first.location?.line).to.equal(3);
  });

  it('reports malformed XML as findings, not as a failed run', async () => {
    const outcome = await validateSchema(valid.replace('</SCL>', ''));

    expect(outcome.status).to.equal('completed');
    if (outcome.status === 'completed') {
      expect(outcome.findings).to.not.be.empty;
    }
  });

  it('validates older schemas selected by the root attributes', async () => {
    const outcome = await validateSchema(
      `<SCL ${NS}><Header id="old"/></SCL>`,
    );

    expect(outcome).to.deep.equal({ status: 'completed', findings: [] });
  });

  it('fails instead of passing when the run cannot complete', async () => {
    for (const text of [
      '',
      '<Other/>',
      valid.replace('release="4"', 'release="9"'),
    ]) {
      const outcome = await validateSchema(text);
      expect(outcome.status, text).to.equal('failed');
    }
  });
});
