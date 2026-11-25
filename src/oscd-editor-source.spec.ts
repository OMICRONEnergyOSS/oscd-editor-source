import { expect, fixture, html, oneEvent, waitUntil } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import { isInsert, isRemove } from '@openscd/oscd-api/utils.js';

import OscdEditorSource from './oscd-editor-source.js';

import type { EditEventV2 } from '@openscd/oscd-api';

customElements.define('oscd-editor-source', OscdEditorSource);

const sclXmlDocString = `<?xml version="1.0" encoding="UTF-8"?><SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:ens1="http://example.org/somePreexistingExtensionNamespace">
  <Substation ens1:foo="a" name="A1" desc="test substation"></Substation>
</SCL>`;

describe('oscd-editor-source', () => {
  let plugin: OscdEditorSource;

  async function waitForEditor() {
    await plugin.updateComplete;
    await waitUntil(
      () =>
        plugin.oscdAceEditor?.editor?.getValue() === plugin.xmlText &&
        plugin.oscdAceEditor.editor.selection.isEmpty(),
      'Ace editor did not load the document',
    );
    return plugin.oscdAceEditor.editor!;
  }

  function toolbarAction(label: string): HTMLElement {
    const buttons =
      plugin.oscdAceEditor.shadowRoot!.querySelectorAll<HTMLElement>(
        '.toolbar oscd-outlined-icon-button',
      );
    const button = Array.from(buttons).find(item => item.ariaLabel === label);
    if (button === undefined) {
      throw new Error(`Missing toolbar action: ${label}`);
    }
    return button;
  }

  beforeEach(async () => {
    const sclDoc = new DOMParser().parseFromString(
      sclXmlDocString,
      'application/xml',
    );
    plugin = await fixture(html`
      <oscd-editor-source
        style="height: 500px; width: 900px"
        .docs=${{ 'test.scd': sclDoc }}
        .doc=${sclDoc}
        .docName=${'test.scd'}
      ></oscd-editor-source>
    `);
  });

  afterEach(() => {
    document.getElementById('ace_settingsmenu')?.remove();
    plugin.remove();
  });

  it('loads a document supplied after the first render', async () => {
    const doc = plugin.doc;
    plugin.remove();
    plugin = await fixture(html`<oscd-editor-source></oscd-editor-source>`);
    plugin.doc = doc;
    const editor = await waitForEditor();

    expect(editor.getValue()).to.equal(
      new XMLSerializer().serializeToString(plugin.doc!),
    );
    expect(editor.getCursorPosition()).to.deep.equal({ row: 0, column: 0 });
    expect(
      plugin.shadowRoot?.querySelector('oscd-filled-button')?.disabled,
    ).to.equal(true);
  });

  it('enables Apply for typed edits and dispatches a root replacement', async () => {
    const editor = await waitForEditor();
    const originalRoot = plugin.doc!.documentElement;
    editor.focus();
    editor.find('test substation');
    const start = editor.getSelectionRange().start;
    const replacement = 'Edited substation with a longer description';
    await sendKeys({ type: replacement });
    await waitUntil(() =>
      plugin.xmlText.includes(
        'desc="Edited substation with a longer description"',
      ),
    );
    await plugin.updateComplete;
    expect(editor.getCursorPosition()).to.deep.equal({
      row: start.row,
      column: start.column + replacement.length,
    });

    const applyButton = plugin.shadowRoot!.querySelector('oscd-filled-button')!;
    expect(applyButton.disabled).to.equal(false);
    expect(plugin.doc!.documentElement === originalRoot).to.equal(true);

    const editEvent = oneEvent(plugin, 'oscd-edit-v2');
    applyButton.click();
    const event: EditEventV2 = await editEvent;
    expect(event.detail).to.include({ title: 'XML Text Edit', squash: true });
    const edits = event.detail.edit;
    expect(Array.isArray(edits)).to.equal(true);
    if (!Array.isArray(edits)) {
      throw new Error('Expected a root replacement edit array');
    }
    expect(edits.length).to.equal(2);
    const [remove, insert] = edits;
    expect(isRemove(remove) && remove.node === originalRoot).to.equal(true);
    expect(isInsert(insert) && insert.parent === plugin.doc).to.equal(true);
    if (isInsert(insert)) {
      expect(insert.reference).to.equal(null);
      expect(
        insert.node instanceof Element
          ? insert.node.querySelector('Substation')?.getAttribute('desc')
          : null,
      ).to.equal('Edited substation with a longer description');
    }
    await plugin.updateComplete;
    expect(applyButton.disabled).to.equal(true);
  });

  it('disables Apply after undo restores the original text', async () => {
    const editor = await waitForEditor();
    const original = editor.getValue();
    editor.focus();
    editor.find('test substation');
    await sendKeys({ type: 'Changed' });
    await waitUntil(() => plugin.xmlText.includes('desc="Changed"'));
    await plugin.updateComplete;
    const applyButton = plugin.shadowRoot!.querySelector('oscd-filled-button')!;
    expect(applyButton.disabled).to.equal(false);

    toolbarAction('Undo').click();
    await waitUntil(() => plugin.xmlText === original);
    await plugin.updateComplete;
    expect(applyButton.disabled).to.equal(true);
  });

  it('shows the shared warning dialog without applying invalid XML', async () => {
    const editor = await waitForEditor();
    const original = new XMLSerializer().serializeToString(plugin.doc!);
    const invalidXml = '<SCL></wrong>';
    let editCount = 0;
    plugin.addEventListener('oscd-edit-v2', () => {
      editCount += 1;
    });
    editor.setValue(invalidXml, -1);
    await waitUntil(() => plugin.xmlText === invalidXml);
    await plugin.updateComplete;
    await plugin.warnDialog.updateComplete;
    await plugin.warnDialog.dialog.updateComplete;

    const applyButton = plugin.shadowRoot!.querySelector('oscd-filled-button')!;
    applyButton.click();
    await waitUntil(() => plugin.warnDialog.dialog.open);
    await plugin.warnDialog.updateComplete;

    expect(
      plugin.warnDialog.shadowRoot
        ?.querySelector('[slot="headline"]')
        ?.textContent?.trim(),
    ).to.equal('Invalid XML');
    expect(
      plugin.warnDialog.shadowRoot
        ?.querySelector('[slot="content"]')
        ?.textContent?.trim().length,
    ).to.be.greaterThan(0);
    expect(editCount).to.equal(0);
    expect(new XMLSerializer().serializeToString(plugin.doc!)).to.equal(
      original,
    );
    expect(plugin.xmlText).to.equal(invalidXml);
    expect(applyButton.disabled).to.equal(false);

    plugin.warnDialog.shadowRoot!.querySelector('oscd-filled-button')!.click();
    await waitUntil(() => !plugin.warnDialog.dialog.open);
  });

  it('refreshes for opaque docVersion changes and retains editCount compatibility', async () => {
    const editor = await waitForEditor();
    editor.insert('draft');
    await waitUntil(() => plugin.xmlText.startsWith('draft'));
    plugin.doc!.documentElement.setAttribute('desc', 'external edit');
    plugin.docVersion = {};
    await waitForEditor();

    expect(editor.getValue()).to.include('desc="external edit"');
    expect(editor.getValue()).not.to.include('draft');
    expect(
      plugin.shadowRoot?.querySelector('oscd-filled-button')?.disabled,
    ).to.equal(true);

    editor.insert('draft');
    await waitUntil(() => plugin.xmlText.startsWith('draft'));
    plugin.docVersion = {};
    await waitForEditor();
    expect(editor.getValue()).not.to.include('draft');

    plugin.doc!.documentElement.setAttribute('desc', 'legacy edit');
    plugin.editCount += 1;
    await waitForEditor();
    expect(editor.getValue()).to.include('desc="legacy edit"');
  });

  it('loads a different document and clears the buffer when it closes', async () => {
    await waitForEditor();
    plugin.doc = new DOMParser().parseFromString('<SCL/>', 'application/xml');
    await waitForEditor();
    expect(plugin.oscdAceEditor.editor!.getValue()).to.equal('<SCL/>');

    plugin.doc = undefined;
    await waitForEditor();
    expect(plugin.oscdAceEditor.editor!.getValue()).to.equal('');
  });

  it('formats the buffer and a selection without changing the document', async () => {
    const editor = await waitForEditor();
    const original = new XMLSerializer().serializeToString(plugin.doc!);
    toolbarAction('Format XML').click();
    await waitForEditor();
    expect(editor.getValue()).to.include('\n\t<Substation');
    expect(new XMLSerializer().serializeToString(plugin.doc!)).to.equal(
      original,
    );

    editor.selectAll();
    toolbarAction('Format XML').click();
    await waitUntil(() => plugin.xmlText === editor.getValue());
    expect(editor.getValue()).to.include('\n\t<Substation');
  });

  it('folds XML and opens search through the toolbar', async () => {
    const editor = await waitForEditor();
    editor.setValue(
      '<SCL>\n<Substation>\n<VoltageLevel/>\n</Substation>\n</SCL>',
      -1,
    );
    await waitUntil(() => plugin.xmlText === editor.getValue());
    toolbarAction('Collapse all').click();
    expect(editor.session.getAllFolds()).to.have.length(1);
    toolbarAction('Expand all').click();
    expect(editor.session.getAllFolds()).to.have.length(0);

    toolbarAction('Search').click();
    await waitUntil(
      () =>
        Boolean(plugin.oscdAceEditor.shadowRoot?.querySelector('.ace_search')),
      'Ace search did not open',
    );
  });

  it('loads the XML worker and reports syntax errors', async function () {
    this.timeout(10000);
    const editor = await waitForEditor();
    editor.setValue('<root></wrong>', -1);
    await waitUntil(
      () => editor.session.getAnnotations().some(item => item.type === 'error'),
      'XML worker did not report invalid XML',
      { timeout: 6000 },
    );
  });

  it('persists settings through the wrapper across editor instances', async () => {
    const editor = await waitForEditor();
    const originalFontSize = editor.getOption('fontSize');
    try {
      editor.setOption('fontSize', 21);
      expect(
        JSON.parse(localStorage.getItem('oscd:ace-options')!).fontSize,
      ).to.equal(21);

      plugin.remove();
      plugin = await fixture(html`<oscd-editor-source></oscd-editor-source>`);
      plugin.doc = new DOMParser().parseFromString('<SCL/>', 'application/xml');
      await waitForEditor();
      expect(plugin.oscdAceEditor.editor!.getOption('fontSize')).to.equal(21);
    } finally {
      plugin.oscdAceEditor.editor?.setOption('fontSize', originalFontSize);
    }
  });

  it('opens the Ace settings menu', async () => {
    await waitUntil(
      () => Boolean(plugin.oscdAceEditor?.editor),
      'Ace editor did not initialize',
    );

    toolbarAction('Settings').click();

    await waitUntil(
      () => Boolean(document.getElementById('ace_settingsmenu')),
      'Ace settings menu did not open',
    );

    const settingsMenu = document.getElementById('ace_settingsmenu');
    const themeOptions = Array.from(
      settingsMenu?.querySelectorAll('select#-theme option') ?? [],
    ).map(option => option.textContent?.trim());

    expect(themeOptions).to.include('OpenSCD');
  });
});
