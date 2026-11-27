# Source editor validation

**Status:** Schema slice implemented (Validate button, status badge, resizable report, schema validator module). Verified: lint, `tsc --noEmit`, 34 tests in Chromium/Firefox/WebKit, and dev and bundled demos by screenshot (valid → "✓ Valid"; edited → "Errors: 1" with report row and line). Reliable error navigation is a known limitation, not a requirement for this milestone.

**Implemented (where):**

- `src/validation/types.ts` — `Finding`, `ValidationOutcome` (completed | failed).
- `src/validation/schema/` — `scl-version.ts` (root-tag sniff → bundled XSD), `schema-validator.ts` (Blob worker, 15s load / 20s validate timeouts, worker terminated after each run).
- `src/validation/schema/generated/{xsd-assets,engine-assets}.ts` — **a copy, not a dependency:** nothing imports `xml-schema-validator` or `xmlvalidate.js` at build or run time. Generated once from `xml-schema-validator` at `e2d808e` (XSDs from `testfiles/schemas`, engine JS and WASM base64 from `xmlvalidate/`). Embedded because `oscd build` (tsc) copies no assets and the wrapper loads its worker/WASM by URL; string modules need no URLs and are cross-origin safe. Lazily imported. No generator script is kept in the repo, so updates are manual until the engine decision (see After the first iteration) is made. The XSD text differs slightly from `oscd-menu-validate/schema/schemas.ts` (unexplained, probably escaping); `xmlvalidate.js/dist` differs slightly from this copy (71917 vs 72289 bytes JS), not investigated.
- `src/validation-actions.ts`, `src/validation-report.ts` — toolbar section and report panel, with sibling specs.
- `src/oscd-editor-source.ts` — orchestration: report opens on findings or failure, closes on clean; stale report kept and flagged; tick hidden when text changes.

**Open checks:** real cross-origin host load of the bundled build (only same-origin verified); worker reuse and cancel; "Errors: N" currently counts warnings too; optional comparison with `oscd-menu-validate` in the demo; one WebKit flake seen once in the "disables Apply after undo" test.

**Local validator checkouts** (references, not plugin dependencies):

- Schema: `/home/steren00/code/stee-re/xml-schema-validator`
- Template: `/home/steren00/code/stee-re/scl-template-validator`
- OCL: `/home/steren00/code/stee-re/ocl-validator`

## First usable iteration (implemented, see Status)

1. **Toolbar action, immediately before Apply.** Schema only at first; add the settings button when more checks exist.
   - **Trigger:** only a Validate click starts a run, never Apply, load or edits. It validates exactly the text the editor shows: the applied document when clean, the unapplied draft when dirty. Malformed XML needs no special handling: the engine reports it itself (see Schema below).
   - **Running:** the button shows a busy indicator and is disabled. Cancelling a run is a later exploration.
   - **Result:** clean shows a green tick and closes the report; findings show a red `Errors: N` and open the report. `Errors: N` can also toggle it. A run that could not complete (worker failure, unsupported schema) is shown as failed, not as clean.
   - **Stale results:** keep the report until the next Validate. Edits and Apply do not clear it, so users can fix errors one at a time. Hide the green tick once the document changes, since it no longer holds. Navigation may point at the wrong place after edits; accepted for now, revisit later (e.g. position tracking).
2. **Report below the editor.** Display the titles and messages the schema validator returns. Findings with a structured `line` are clickable (keyboard-operable button) and move the Ace cursor to that line; findings without a location stay plain. Do not infer positions from display strings. Navigation may be off for stale reports or multi-line start tags. Make the top edge draggable and keyboard-resizable; keep both panes usable and check that Ace redraws after resizing.
3. **Verify end to end without changing the validator.** Run a known schema-valid document, one with a known XSD violation, and malformed and empty text through Validate → schema worker → badge/report. Check multiple findings, worker failure, stale runs and cross-origin bundled worker/WASM loading as well as the dev server.

## Keep the validation logic portable

Validation is a standalone module inside this plugin (own folder, no Ace, Lit or OpenSCD imports) that the editor drives and reads state from. It takes the XML text plus a document name and returns findings, not Ace annotations or OpenSCD events. Schema validation uses the string directly, so reported lines match the editor; element-based validators (template) parse that same text. Keep the result small: validator ID, readable message, optional location with an explicit coordinate convention, and original diagnostic data where available. Record run failures separately from document findings, even if another validator succeeds. The plugin owns settings, staleness, badges and presentation; only its navigation layer translates locations to Ace rows. Keep this in the repo for now, written so it can be extracted later; no shared package, shell store or cross-plugin bus is needed.

**What oscd-menu-validate teaches (reference only):** we build our own module and do not import its code or UI. It shows today's behavior: `../oscd-menu-validate/oscd-menu-validate.ts` runs schema validation as a promise and consumes template findings in batches via `for await (… of validate(doc))`. Its menu may optionally be added to the demo for comparison.

- **Schema:** `../oscd-menu-validate/schema/validateSchema.ts` takes an `XMLDocument`, serializes it, selects a bundled XSD by version/revision/release, loads it into a Blob worker, validates, and terminates the worker even after timeout. Ours takes the string, with no serialization or parse. It sniffs `version`/`revision`/`release` from the root start tag with a regex, on every run (cheap, nothing to cache); no match or no bundled XSD is a failed run ("can't determine SCL version"), never findings.
  - **Probed (Node, bundled 2007B4 XSD, repo test files):** valid → `valid: true`. Schema violations → level 2 errors with `line`, `column: -1`, positive final code. Malformed XML → level 3 errors with line and column, final code `-1`, so the engine reports it itself. Empty string → `valid: false`, code `-1`, no message: treat as a failed run. `xsi:schemaLocation` is ignored (removing it is still valid), so there is no "missing XSD" error to catch. Editing `release` yields an ordinary fixed-value error, so retry-on-error to detect a changed version is not viable; the up-front sniff is. Preserve cross-origin asset loading. Both this adapter and the published wrapper flatten diagnostics to display strings. Even the underlying worker can return `column: -1` or a line at the end of a multiline start tag.
- **Template:** the validator works on XML elements, not source offsets. Preserve the actual offending element (or the existing owner for a missing child) when enriching the validator. Map it to the **validated text**, not a fresh serialization or the current draft. Do not infer identity from a repeated value or assume IDs are unique in an invalid document.

## UI choices to review

- **Resize:** For one horizontal divider, start with CSS Grid and a focusable separator controlling one row height (pointer + Up/Down keys, accessible name, value and bounds). CSS `resize` alone does not give the report a keyboard-operable top divider. [split-grid](https://github.com/nathancahill/split/tree/master/packages/split-grid) is a zero-dependency alternative with draggable gutters and per-row limits; keyboard/ARIA behavior still belongs to us. Use it if the layout grows beyond one divider. See the [window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).
- **Debug:** Keep the normal view as the error list. If raw inspection proves useful, let `oscd-editor-source-validator-debug` in localStorage expose a **Raw JSON** view in the same panel. Prefer selectable, read-only preformatted JSON first; a lazy read-only Ace JSON view adds highlighting at the cost of a second editor instance. Pretty-printed console output is a cheaper development-only alternative. Only stringify on demand; no unconditional logging of document diagnostics.

## After the first iteration

1. **Before enriching schema errors, decide whether to improve or replace the engine.** The current wrapper uses the older [openscd/xmlvalidate.js](https://github.com/openscd/xmlvalidate.js) build of libxml2 via WASM. When reliable locations become the goal, compare updating that stack with adopting a maintained browser XSD library. Candidates to evaluate, not selections: [xmllint-wasm](https://github.com/noppa/xmllint-wasm) and [xml-xsd_validator-browser](https://github.com/ferdisap/xml-xsd_validator-browser). Use representative SCL/XSDs to check diagnostic quality and browser deployment before changing engines.
2. Wire template validation into the same report and add validator selection. For navigation, map trustworthy schema locations or template elements to the **validated text**. Test repeated values, missing attributes, multiline tags and ambiguous locations; keep findings without a reliable target in the list.
3. Add sorting/filtering to the list and precise range underlines with explanatory tooltips where supported. Preserve Ace's existing XML syntax diagnostics. If source indexing is needed, build it once per validated text, not once per finding.
4. Integrate the OCL validator through the same adapter/settings/report path.
