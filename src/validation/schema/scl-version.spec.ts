import { expect } from '@open-wc/testing';

import { getSchemaKey, sniffSclVersion } from './scl-version.js';

describe('sniffSclVersion', () => {
  it('reads version attributes from the root start tag', () => {
    expect(
      sniffSclVersion(
        '<?xml version="1.0"?><SCL xmlns="x" version="2007" revision="B" release="4"><Header/></SCL>',
      ),
    ).to.deep.equal({ version: '2007', revision: 'B', release: '4' });
  });

  it('skips a prolog containing look-alike tags and accepts single quotes', () => {
    const xml = `\uFEFF<?xml version="1.0"?>\n<!-- <SCL version="1999"> -->\n<SCL version='2007'\n  revision='B'>`;
    expect(sniffSclVersion(xml)).to.deep.equal({
      version: '2007',
      revision: 'B',
      release: '',
    });
  });

  it('does not stop at a > inside an attribute value', () => {
    expect(
      sniffSclVersion('<SCL desc="a > b" version="2007" revision="B">'),
    ).to.deep.equal({ version: '2007', revision: 'B', release: '' });
  });

  it('returns null without an SCL root', () => {
    expect(sniffSclVersion('')).to.equal(null);
    expect(sniffSclVersion('<Other version="2007"/>')).to.equal(null);
    expect(sniffSclVersion('<SCLX version="2007"/>')).to.equal(null);
  });
});

describe('getSchemaKey', () => {
  it('maps versions to the bundled schemas', () => {
    const key = (version: string, revision: string, release: string) =>
      getSchemaKey({ version, revision, release });
    expect(key('', '', '')).to.equal('2003');
    expect(key('2007', 'B', '')).to.equal('2007B');
    expect(key('2007', 'B', '3')).to.equal('2007B4');
    expect(key('2007', 'B', '4')).to.equal('2007B4');
    expect(key('2099', 'Z', '9')).to.equal(null);
  });
});
