# Validator workbench in the source editor

## Goal and current direction

Start with **schema validation inside oscd-editor-source**: a button, useful
error messages beside the code, and a way to inspect the complete error data.
Use that workbench to improve what the validator returns. Add template
validation later; precise underlines remain the longer-term goal.

The previous plan jumped too far into cross-plugin architecture. Do not start
with a diagnostics event system, shell-wide store, or source-position index.
The source editor can call the validator directly; it must not depend on the
validation menu component.

## Decisions and approval

- **DP-1, earlier decision:** "Applied document first; clear stale underlines
  when the draft changes." Validating unapplied text has not been approved.
- **DP-2, revised direction:** use oscd-editor-source as the initial workbench,
  starting with schema validation, then template validation.
- **DP-3, debug proposal:** use localStorage key
  `oscd-editor-source-validator-debug`, enabled by the string `"true"`, to
  expose raw error JSON. Suggested UI: gutter messages plus a selectable debug
  panel for complete, copyable payloads. This detail still needs agreement.
- **DP-4, prerequisite:** finish and verify the existing migration to the
  oscd-ui Ace wrapper before adding validation. It exposes the underlying Ace
  instance, so the migration does not remove the hooks the workbench needs.
- **Approval:** on 2026-11-05 the user requested this brief rewrite and move
  from oscd-menu-validate, then requested this prerequisite plan. Documentation
  updates only were authorized at that point.
- **Implementation approval, 2026-11-05:** the user approved starting the Ace
  migration against the latest published oscd-ui, which they installed as
  `^0.1.2`. Preserve their existing changes. Finish and verify Ace first; no
  validation implementation is authorized.
- **Additional prerequisite:** after Ace, refresh the repo using oscd-tooling
  and replace the demo's oscd-menu-open/save plugins with oscd-menu-commons.
  This precedes validation. Review the concrete refresh plan and outstanding
  tooling decisions after the Ace checkpoint.

## Before the main task: finish the Ace migration

The five pre-existing modified files are a partly completed replacement of
`ace-custom-element` with `oscd-ui`'s `<oscd-ace-editor>`, not validation work.
Finish this as a separate prerequisite, preserving current editor behavior:

1. **Align dependency and asset paths.** The plugin imports
   `@omicronenergy/oscd-ui/editor/OscdAceEditor.js`, but the local UI checkout
   contains `ace-editor/OscdAceEditor.ts`. Check the package's intended exports
   and built output; correct the import and Rollup asset-copy paths accordingly.
   Check worker/theme loading rather than merely renaming directories.
   The user has chosen the published `^0.1.2` dependency; retain that choice.
2. **Remove overlapping ownership.** Both the plugin and the UI wrapper manage
   Ace settings persistence and settings-menu initialization. Let the wrapper
   own the shared behavior, preserving existing stored settings. Check which
   options it actually forwards: the current wrapper passes value/mode/theme
   internally but does not forward the plugin's `basePath` attribute.
3. **Prove the editor still works.** Verify loading, typing, formatting,
   Apply, folding, search, settings persistence, theme and XML-worker loading
   in the demo and bundled deployment. Keep tests aligned with the new wrapper.
   Type-check and relevant tests/build/lint must pass before validation work.

The needed hooks remain available through `oscdAceEditor.editor`: read the
buffer, access session annotations/range markers, and subscribe to Ace events.
Keep validation orchestration/debug inspection in this plugin. A small UI API
for custom marker styles can wait until underlines need it; do not reach
through nested shadow roots as the initial design.

**Baseline check, 2026-11-05:** running
`node_modules/.bin/tsc --noEmit --incremental false` in this repo failed with
six errors: unresolved Ace-wrapper import, three missing `window.ace` types,
and two implicit-any callback parameters. Recheck after resolving the import;
some errors may be consequences of it. No browser/build verification performed.

**Approved implementation plan, 2026-11-05:**

1. Use the published `ace-editor/OscdAceEditor.js` export. Remove plugin-owned
   Ace persistence and settings-menu initialization; retain the shared
   `oscd:ace-options` storage key through the wrapper.
2. Remove unused mode/theme/basePath bindings. The wrapper supplies these and
   registers its worker with `new URL(..., import.meta.url)`; use the existing
   Rollup import-meta-assets plugin instead of copying the full Ace tree.
3. Ensure initial document loading, document switches and opaque docVersion
   updates reach the buffer; retain editCount compatibility for existing hosts.
   Preserve editing, formatting, Apply, folding, search and settings behavior.
4. Add focused integration specs and run type-check, tests, lint and both builds.
   Exercise worker/theme loading in the development demo and bundled plugin.

Installed-package inspection confirms `oscd-ui` 0.1.2 has the expected export,
uses the existing settings key, bundles the search/settings/theme modules and
registers its XML worker from `dist/ace-editor/ace/worker-xml.js`. The old
six-error type-check failure was reproduced with this published dependency.

### Initial Ace migration checkpoint and upstream blocker, 2026-11-05

This subsection records the initial failed checkpoint; final local verification
and the remaining published-release gate are recorded in Step 2 below.

Implemented in this repo:

- Corrected the published Ace-wrapper import and removed duplicate settings
  persistence/initialization and ineffective mode/theme/basePath bindings.
- Removed full-distribution Ace copies from Rollup. The existing
  import-meta-assets plugin builds the wrapper's worker URL successfully.
- Load documents on initial assignment, switches and opaque docVersion changes;
  retain editCount compatibility, and clear the buffer when doc is removed.
- Track Apply's dirty state reactively. An initial separate programmatic buffer
  value avoided the wrapper's cursor resets; this workaround was subsequently
  removed after fixing the upstream wrapper itself.
- Added focused integration tests for loading, typing/Apply, host updates,
  formatting, folding/search, settings persistence/menu and XML-worker errors.

Verification:

- `node_modules/.bin/tsc --noEmit --incremental false`: passed.
- `npm run lint` and `git --no-pager diff --check`: passed; no formatting-only
  tools or auto-fix commands run.
- `npm run build`: passed.
- `npm run bundle`: passed; the demo retains its existing remote-shell
  external-dependency warning. Bundled browser deployment is not yet verified.
- Installed the Firefox and WebKit binaries required by existing Playwright
  configuration after the first test run reported them missing.
- Latest `npm test`: Firefox 9/9 and WebKit 9/9 passed; Chromium 8/9 passed.
  The long typing/Apply test exposes intermittent data loss. Earlier runs also
  reproduced typing failure in WebKit. XML-worker error reporting passes in
  all three browsers; an unclosed tag produces a warning, so the error test
  uses a mismatched closing tag instead.

**Blocking upstream defect in published oscd-ui 0.1.2:**
`dist/ace-editor/internal/ace-editor-base/AceEditorBase.js`'s debounced
`handleChange` writes the current text to its `value` attribute. Attribute
observation schedules `initializeEditor`, which later compares the buffer
against that snapshot and calls `setValue` with it. Keystrokes arriving between
those two callbacks are overwritten.

A read-only browser trace reproduced this independently of WTR: Ace received
the entire typed description, then emitted a removal of the full buffer and
an insertion of an older prefix. Only the older prefix reached the plugin.
No cursor-reset call occurred in that trace. Thus removing the plugin's input
echo fixes one problem but does not fix this separate upstream race. Do not
hide it by shortening typing tests, increasing timeouts or patching installed
node_modules. The legacy local theme file remains unused; cleanup can wait
for the refresh.

**Resolved decision:** approval was requested to inspect/fix the sibling
`../oscd-ui` source and verify it locally, then consume a new published version.
At this checkpoint no sibling source, dependency selection or tooling migration
had been changed. Temporary trace browser/server processes were stopped.

**Upstream scope approved:** the user approved fixing the sibling oscd-ui
source/tests and verifying its local build here, without publishing, Git writes
or changing this plugin's published dependency declaration. At inspection the
sibling worktree was clean and three fetched commits behind origin/main (dependency bumps and the
0.1.2 release); the Ace source is unchanged across those commits. No pull or
other Git write is needed for this fix.

Upstream plan: ignore `value` notifications that already match the live Ace
buffer, covering both attribute and property notifications. This prevents
internal input synchronization from scheduling a stale reinitialization while
retaining external value updates. Add deterministic base-component regressions
that insert more text during a change notification, including after clearing
the buffer, plus external property/attribute update coverage. Verify those tests
before and after the fix, then exercise the plugin against the local package.

The same upstream scope also covers the wrapper's input-echo cursor reset:
replace its delayed selection/cursor callbacks with the base's existing
`valueUpdateMode="start"` behavior. This preserves the initial/programmatic
cursor position without disturbing live input, allowing the plugin to retain
a single text value. Add wrapper regressions and cover unchanged-document
docVersion refreshes over a dirty draft.

## Repository refresh checkpoint (after Ace)

### New priority: reconcile the editor feature branch, 2026-11-05

The user requested review/reconciliation of oscd-ui's editor feature work and
integration into main so the next release contains text and SCL-element editors,
coherent stories and shared input fixes. Do not publish a release as part of
this request. Existing uncommitted Ace fixes in the sibling must be preserved.

Read-only comparison of fetched refs found:

- `origin/feat_add-sld-icons` contains the evolved `OscdAceEditor` and
  `OscdSclEditor`; the latter was previously named `OscdXmlEditor`.
- The feature branch already attempts to fix the same synchronization problem:
  a `_syncingFromEditor` guard, direct Ace accessors with a pending initial
  value, and readiness handling. Reconcile this design rather than layering
  yesterday's simpler fixes blindly over it.
- The branch also contains unrelated SLD icons, catalog/theming work and older
  versions of many components/configs. Its tip differs from current main in
  102 files. This tip comparison is not a prediction that a normal merge would
  delete all newer main work; an actual integration needs careful reconciliation.
- Stories need review: the Ace validator example listens for a
  `connectedCallback` DOM event that component lifecycle does not automatically
  dispatch; the SCL example uses an unnamespaced element without full context.

Approved bounded scope:

1. Port/reconcile only Ace/SCL editor work onto current main, retaining current
   theming tokens and unrelated main changes; do not merge unrelated SLD work.
2. Review shared input synchronization, readiness/reconnection, external updates,
   form/validation/event behavior and namespace context. Keep one shared fix.
3. Ensure both exported entrypoints exist; remove obsolete xml-editor export
   pointers. Write runnable, coherent text/element/toolbar/validation stories.
4. Preserve/add regressions for both editors and run focused tests, type-check,
   lint, package build and Storybook build/browser checks, then plugin checks.
5. Review the final change set before any staging/commit/local-main integration.
   No publishing or remote writes without explicit approval.

The user selected "Editor-only reconciliation onto main (recommended)" and
then said "please proceed". This approves the port and verification, not Git
staging/history/remote writes. Both repositories stayed on local main; no stash,
branch switch or merge was performed. Unrelated feature-branch work is excluded.

Follow-up requested during verification: finish the current reconciliation
checkpoint first, then locate an existing, more elaborate SCL fixture for the
editor stories. Investigate reuse before creating another synthetic sample.

Read-only fixture investigation after the checkpoint:

- This repo's `demo/sample.scd` and oscd-menu-commons' demo are only ten lines.
  oscd-ui has no existing standalone SCL fixture.
- Recommended: `../oscd-editor-publisher/demo/sample.scd` (287 lines, 10,718
  bytes, Apache-2.0 repo). It contains Substation/Communication, five IEDs,
  GOOSE and sampled-value publishers, subscriber inputs and DataTypeTemplates.
  Use the full document in the text editor and `IED[name="PUB_A"]` from that
  same parsed document in the Element editor. Keep namespace-specific coverage
  in tests/an explicit example. No XSD validation was performed in this search.
- Other options: `../oscd-editor-ied/demo/sample.scd` (259 lines, 7,276 bytes)
  has less communication coverage; `../oscd-menu-validate/demo/sample.scd`
  (340 lines, 11,751 bytes) is a richer subscriber-oriented variant.
- Larger legacy OpenSCD fixtures also exist, but are less suitable as concise
  examples and some retain original tool/user history metadata.
- Proposed follow-up: vendor one attributed fixture inside oscd-ui and reuse
  it in both story files; do not make Storybook depend on a sibling checkout.
- Approval: the user selected "Use the publisher fixture". Implementation and
  verification are recorded in Step 4 below.
- Story naming follow-up approved: replace ambiguous Default labels with
  "Full SCL document (text input)" under Ace Editor and
  "SCL element (Element input)" under SCL Editor; describe `.value` versus
  `.element`. Same fixture and behavior; toolbar/validation examples unchanged.

The user requested oscd-tooling and oscd-menu-commons before validation. Keep
this a separate change from Ace behavior. Inspect the tooling's published
configuration and asset handling, replace duplicated build/test/lint configs,
update README and demo plugin registration, and verify install, type-check,
lint, build, bundle and tests. Do not silently run formatting-only commands or
write Git history/staging/configuration. Tooling hook installation needs
explicit approval if it changes Git configuration. Decide whether to retain
custom-elements manifest generation with the user before this phase.

## Before starting validation: resolve the text source

**Should the button validate unapplied text currently displayed in Ace, or
only the applied document?**

Current-buffer validation offers the simplest edit/validate loop but changes
DP-1. Applied-only validation must not place markers against a different or
dirty buffer. In either case, line numbers must refer to the exact text sent
to the validator, not a separately serialized copy.

Resolve this before implementing validation, not as a blocker to the separate
Ace migration. Obtain implementation approval for each agreed scope first.

## Plan of attack

1. **Complete the Ace prerequisite above, then the repository refresh.** Then
   locate the schema validator's upstream source/build process and agree where
   its changes will live.
2. **Build one usable schema experiment.** Add a Validate schema button and
   make the full worker error payload available before it is reduced to text.
   Keep readable messages, add gutter annotations where a line is known, and
   expose raw JSON when debug mode is enabled. No exact underlines required.
3. **Exercise and improve the output.** Try invalid attribute values, missing
   attributes, multiline tags, repeated values and same-line sibling elements.
   Record what each error returns and what cannot yet be located. Improve the
   underlying validator where needed, rather than parsing display messages.
4. **Review the evidence before expanding.** Decide whether native changes are
   needed for exact locations; then plan underlines and template validation.
   Do not build the eventual integration before proving the error data.

For the first experiment, validation is button-triggered, not on every
keystroke. Clear stale results on text/document changes and ignore results from
older runs. Report validation failures separately from "no errors". Preserve
Apply, formatting, and Ace's existing XML syntax diagnostics.

## What we already know

### Responsibilities and files

- Sibling repo `../oscd-menu-validate`: mainly runs the two validators and shows
  their results. It also chooses bundled XSDs, handles worker loading/timeouts,
  and offers automatic runs, notifications and copying. Its demo loads the
  source editor through the shell; the menu does not control that editor.
- `../oscd-menu-validate/schema/validateSchema.ts` and `schema/schemas.ts`:
  schema selection and a Blob Worker adapter for cross-origin JS/WASM loading.
  Preserve that deployment capability. Changing the upstream public wrapper
  alone will not change this adapter's results.
- Installed `@openenergytools/xml-schema-validator` 0.0.1:
  `dist/xml-schema-validator.js` reduces worker errors to `title` and `message`.
  The menu adapter independently does the same. Neither public result currently
  exposes the full raw error. Keep existing display fields when enriching it.
- `src/oscd-editor-source.ts`: `xmlText` is the buffer; Apply parses it and
  replaces the document root. Formatting can change text without Apply.
  `oscdAceEditor.editor` exposes Ace. Annotations give gutter messages;
  underlines require range markers and styles inside the appropriate shadow root.
- The source editor currently updates from `editCount`; it declares but does
  not use `docVersion` in `updated()`. Treat `docVersion` as opaque, not a counter.

### Raw schema errors: evidence, not promises

An earlier in-memory Node VM probe loaded the installed
`dist/xmlvalidate/xmlvalidate.js` and `.wasm` and used a tiny XSD requiring an
integer `count` attribute:

| Invalid XML | Relevant raw fields |
|---|---|
| `<root count="not-a-number"/>` | `line: 1`, `column: -1`, `node: "count"`, `part: "not-a-number"`, `code: 1824`, `level: 2` |
| Same tag spread over three lines | `line: 3`, `column: -1`, `node: "count"` |
| `<root/>` | `line: 1`, `column: -1`, `node: "root"`, `part: "count"`, `code: 1868` |

Preserve `file`, `message` and these raw fields. Columns can be unusable; lines
can point to the end of a start tag. `node` is not a unique path, `part` changes
meaning, and no end positions were observed. These probes do not cover every
error; native bridge sources/build tooling have not been inspected.

Unknown locations belong in the results panel, not falsely on the first line.
Ace row 0 is the first displayed line. Known native line numbering must be
checked and converted. Do not guess exact ranges by searching repeated values.

## Later, only when needed

- Precise schema anchors may require native bridge/WASM changes to expose a
  unique XML node/attribute address. Some errors may remain unlocated.
- Template validators already know the offending Element but discard it.
  Preserve the actual nested element, not merely its top-level group; anchor
  missing items to their existing owner. Missing/duplicate IDs prevent relying
  solely on SCL IDs.
- Exact underlines may need XML-aware source spans, accounting for namespaces,
  comments, CDATA, entities, CRLF and Unicode/editor coordinates. Build any
  index once per text snapshot, not once per error.
- Shared results between plugins can be considered later. Sibling plugins do
  not receive each other's bubbling events automatically; no shared diagnostics
  contract currently exists. This is not a prerequisite for the workbench.
- Optional validation on load can be controlled by a demo-page URL parameter
  regardless of `src`/`tagName`. A module URL parameter has no tagName equivalent.
  The inspected shell does not forward arbitrary plugin settings. No on-load
  behavior or configuration mechanism has been chosen.

## Resume safely and verify

As of 2026-11-05, existing source-editor changes are in `package.json`,
`package-lock.json`, `rollup.config.js`, `src/oscd-editor-source.ts` and its spec.
Do not revert them. The user replaced the earlier local UI dependency with
published `^0.1.2`; the unresolved Ace-wrapper import was confirmed by the
type-check recorded above.
Neither validator is currently declared in this repo's dependencies.

After implementation, use focused existing Web Test Runner specs,
`node_modules/.bin/tsc --noEmit --incremental false`, and appropriate existing
lint/build checks. Cover raw-field preservation, line conversion, unknown
locations, stale results and real gutter rendering. Verify browser worker/WASM
loading, including cross-origin deployment; the earlier VM probe did not.
Do not run formatting-only tools, stage, or commit.

## Step Status

- Step 1, assessment and revised handoff: done.
- Step 2, Ace integration and upstream fixes: done and verified against a local
  oscd-ui package build; published consumption remains gated below.
- Ace release gate: blocked until the oscd-ui fixes are published and adopted.
  Published 0.1.2 is still installed and declared; it has the known input bugs.
- Step 3, editor-only feature reconciliation: done in the oscd-ui main worktree
  and verified; final diff/Git integration and release remain pending approval.
- Step 4, richer shared story fixture: done; publisher demo reused and all
  seven stories verified again in the browser.
- Step 5, full-height editor stories: done; all seven previews fill the
  viewport, with space reserved for the validator button.
- Step 6, explicit full-document and Element stories: done; eight stories
  verified, using the existing Element API without XMLDocument input support.
- Step 7, custom validation story clarification: done; title and instructions
  distinguish the callback example from SCL schema validation.
- Step 8, consistent Storybook helpers: done; both editor stories reuse the
  existing metadata/decorator path and hide private/protected/static members.
- Prerequisite, repository refresh: queued after Ace; oscd-tooling and
  oscd-menu-commons requested, concrete plan/remaining decisions pending.
- Workbench implementation: not started; depends on the verified migration,
  text-source decision and implementation approval.

## Step 8 Completion Summary

### Files transformed

- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` and
  `../oscd-ui/scl-editor/OscdSclEditor.stories.ts` — user-approved alignment
  with other stories: use `getStorybookMeta` for defaults, filtered argTypes,
  autodocs and the CSS-variable decorator. Keep explicit templates for the
  text/root/nested Element examples, validators and full-height layouts.
  Omit textContent because these editors take properties, not slotted text.
- No shared helper, component, manifest or dependency changes. Private fields
  were already correctly marked in the manifest; these stories had bypassed
  the repository helper's existing table filters.

### Verification

- Targeted ESLint on both story files, `node_modules/.bin/tsc --noEmit`,
  `git --no-pager diff --check` and `npm run bundle` in oscd-ui: passed.
  Initial lint flagged the new destructuring layout; adjusted manually without
  invoking a formatter.
- `node <session>/files/verify-editor-stories.mjs`: all eight stories passed.
  Actual resolved Storybook argTypes mark scopedElements, internals,
  pendingValue and toolbarOpen as table-disabled in every story. Toolbar
  remains a boolean control. Storybook channel arg updates also successfully
  change the toolbar and a CSS token through the shared decorator in all
  three main examples.
- Existing live typing, Element conversion, validity, accessible toolbar and
  responsive full-height assertions also passed. Helpers' inferred args do
  not overwrite the explicit text/Element bindings. No component suite rerun
  was needed for story-only metadata/decorator changes.

## Step 7 Completion Summary

### Files transformed

- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` — user-approved rename of
  With Validator to "Custom validation callback"; description explains the
  callback's message/null contract, intentionally malformed starting text,
  Check XML button and valid replacement. Explicitly states that the example
  checks XML well-formedness, not SCL schema validity. Behavior is unchanged.

### Verification

- `node_modules/.bin/eslint ace-editor/OscdAceEditor.stories.ts`,
  `node_modules/.bin/tsc --noEmit`, `git --no-pager diff --check` and
  `npm run bundle` in oscd-ui: passed.
- `node <session>/files/verify-editor-stories.mjs`: all eight stories passed,
  including the exact new displayed title and the existing validity checks.

## Step 6 Completion Summary

### Decision points applied

- User approved "SCL Doc as text" under Ace and two SCL examples named
  "Full SCL Document" and "SCL Element", using the same fixture.
- The full SCL example passes `.documentElement` through `.element`; no
  XMLDocument input API was added. Checked original XML-editor commit 5f74ccc
  and the feature-branch SCL editor: both exposed Element input, not a
  document-preserving API. Document-level nodes/XML declaration are explicitly
  excluded from the new root-element story's description.

### Files transformed

- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` — requested text-story name.
- `../oscd-ui/scl-editor/OscdSclEditor.stories.ts` — new Full SCL Document
  story before SCL Element; shared parser supplies either the root SCL Element
  or nested PUB_A IED. Existing toolbar/validity examples are unchanged.
- `../oscd-ui/README.md` — describes all three input examples and the root
  Element versus XMLDocument distinction.

### Verification

- Targeted ESLint on both story files, `node_modules/.bin/tsc --noEmit`,
  `git --no-pager diff --check` and `npm run bundle`: passed.
- `node <session>/files/verify-editor-stories.mjs`: all eight stories passed.
  Verified exact displayed titles, full-root parsing with five IEDs, nested
  PUB_A parsing, host-echoed live typing in all three main examples, validity,
  toolbar/search and full-height layout at 720px and 480px.
- An initial verifier run failed because its old toolbar branch assumed every
  non-full-document story exposed `.element`, including the text toolbar.
  Corrected that session-only assertion; no component change was required.
- No component behavior, dependencies, generated metadata or Git state changed.

## Step 5 Completion Summary

### Files transformed

- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` — user-approved correction
  replaces the 80vh editor limit with 100vh. The validator form fills 100vh
  using a flex column; its editor takes remaining space and the button stays
  visible rather than requiring arbitrary 70vh sizing.
- `../oscd-ui/scl-editor/OscdSclEditor.stories.ts` — all Element, toolbar,
  invalid and empty previews now fill 100vh. Component behavior is unchanged.

### Verification

- Targeted ESLint on both story files, `node_modules/.bin/tsc --noEmit`,
  `git --no-pager diff --check` and `npm run bundle`: passed.
- `node <session>/files/verify-editor-stories.mjs`: all seven stories passed.
  At both 720px and 480px viewport heights, verified top alignment, viewport
  bottom alignment (including validator button), matching internal Ace height
  and no document vertical overflow, plus existing typing/toolbar/validity
  checks. Temporary browser/server stopped afterward.

## Step 4 Completion Summary

### Files copied

- `../oscd-ui/ace-editor/sample-scl.ts` — one attributed, shared XML string
  copied from `OMICRONEnergyOSS/oscd-editor-publisher/demo/sample.scd`.
  The XML is byte-for-byte identical to the existing 287-line demo; a normal
  TypeScript module follows the existing sample-tree pattern without adding
  Vite raw-import types, asset-copy tooling or runtime sibling dependencies.

### Files transformed

- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` — Default/WithToolbar now
  display the full shared document, including five IEDs, communication,
  GOOSE/sampled values and data templates.
- `../oscd-ui/scl-editor/OscdSclEditor.stories.ts` — Default/WithToolbar now
  edit the shared document's PUB_A IED with inherited SCL namespace context;
  malformed and empty examples remain focused. Namespace extension edge cases
  remain covered by component/utility tests.
- `../oscd-ui/README.md` — describes the shared document/Element examples,
  records fixture provenance and avoids claiming XSD conformance.
- Approved naming follow-up: the main exports are now `FullSclDocument` and
  `SclElement`, labeled "Full SCL document (text input)" and
  "SCL element (Element input)". Story descriptions explicitly distinguish
  passing the whole XML string via `.value` from passing PUB_A via `.element`.

### Verification

- In `../oscd-ui`, `npm run lint`, `node_modules/.bin/tsc --noEmit` and
  `git --no-pager diff --check`: passed.
- Read-only Node assertion comparing the exported string with the original
  publisher demo: exact match.
- `npm run bundle` and session-only `files/verify-editor-stories.mjs`:
  all seven stories passed. Browser checks confirm full-document content,
  PUB_A Element selection/conversion, live host-echo typing, toolbar/search,
  malformed XML and empty/custom-validator behavior.
- No component behavior changed in this follow-up, so the 254-test full suite,
  75 focused cross-browser executions and 27 plugin executions from Step 3
  remain the applicable behavior checks; they were not redundantly rerun.
- Manifest globs exclude story/fixture modules, so no additional generated
  component metadata is needed. No dependency, source-plugin or Git changes.
- After renaming, targeted ESLint on both story files,
  `node_modules/.bin/tsc --noEmit`, `git --no-pager diff --check`,
  `npm run bundle` and the seven-story browser verifier passed again.

## Step 3 Completion Summary

### Bugs found during story/browser verification (all fixed)

1. **Unnamed toolbar actions:** dynamically created scoped icon buttons lost
   attribute-bound ARIA labels. Bind their `ariaLabel` properties instead;
   the regression checks the actual shadow button's accessible label and the
   Storybook verifier locates/clicks actions by accessible name.
2. **Extra XML content silently discarded:** parsing previously selected the
   first element. Require exactly one element and reject non-whitespace text
   and CDATA siblings.
3. **Valid extension content mistaken for a parse error:** searching globally
   for a `parsererror` element rejects valid XHTML extension content. A unique
   trailing XML comment now proves the parser reached the end; it is removed
   before returning the element. Tests include user marker-like comments and
   malformed input after such a comment.

### Files created

- `../oscd-ui/scl-editor/OscdSclEditor.ts` and `oscd-scl-editor.ts` — scoped
  class/global entrypoints; Element input/output shares the corrected Ace
  lifecycle, captures namespace context and never mutates the source document.
- `../oscd-ui/scl-editor/internal/namespace-utils.ts` and its spec — safe
  namespace snapshot/serialization/parsing, including intermediate prefix
  rebinding, namespace resets, escaped URIs and invalid single-element input.
- `../oscd-ui/scl-editor/OscdSclEditor.spec.ts` — Element conversion, validity,
  shared events and reconnect regression coverage.
- `../oscd-ui/scl-editor/OscdSclEditor.stories.ts` — Element, toolbar,
  malformed XML and empty-input stories.

### Files transformed

- `../oscd-ui/ace-editor/internal/AceEditor.ts` — direct live-value accessor,
  latest pending initial value, synchronous external updates and one-time
  ready synchronization; no input feedback render or delayed cursor reset.
- `../oscd-ui/ace-editor/internal/ace-editor-base/AceEditorBase.ts` — value
  updates are synchronous and separate from settings reinitialization;
  settings/reconnection cannot restore stale text.
- `../oscd-ui/ace-editor/OscdAceEditor.ts` — optional shared toolbar, native
  form values, validator/custom validity, input notification and compatible
  text-bearing change events. Current main's theme tokens are retained.
- Ace wrapper/base specs — deterministic rapid-input regressions, initial and
  external writes, cursor echoes, forms, events and accessible toolbar actions.
- `../oscd-ui/ace-editor/OscdAceEditor.stories.ts` — explicit typed story
  bindings and an actually installed validator rather than a nonexistent
  lifecycle DOM event.
- `../oscd-ui/package.json` — replace nonexistent xml-editor export pointers
  with both real scl-editor entrypoints; no version/dependency changes.
- `../oscd-ui/README.md` and `custom-elements.json` — document the two APIs and
  event contracts. Generated metadata has semantic changes only in the two
  public editor modules, shared Ace module and new namespace utility; retained
  unrelated module ordering to avoid broad generation churn.

### Decision points applied

- Port editor functionality, not the whole SLD/icons feature branch. This
  supersedes the earlier small upstream patch with the reconciled direct/live
  value ownership model; both components use the same fix.
- Preserve `CustomEvent<string>('change')` on edits for existing plugin
  consumers; add `input`. Do not adopt the feature branch's breaking
  change-on-blur behavior. Programmatic writes emit neither.
- SCL validity means XML well-formedness/exactly one element, not XSD/IEC
  schema validity. Empty is allowed. Namespace context is a snapshot from
  `element` assignment; reading `element` produces a new parsed element.
- Toolbar formatting retains the feature's basic regex-based XML formatter;
  it is not a canonicalizer or a mixed-content-preserving XML formatter.
- No Git writes, release/version bump, publishing, unrelated SLD/theme
  changes, tooling migration or validation-workbench implementation.

### Verification

- In `../oscd-ui`, `npm test`: 254 passing tests across 76 files; coverage
  92.37%. `npm run lint`, `npm run check:component-tokens`,
  `node_modules/.bin/tsc --noEmit` and `git --no-pager diff --check`: passed.
- Focused WTR run of the public Ace/base/SCL/namespace specs with
  `playwrightLauncher`: 25 passing in each of Chromium, Firefox and WebKit
  (75 executions). Used `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` because
  host validation traversed a dangling Firefox installation lock symlink;
  actual Firefox launched and passed. No shared cache/lock files were changed.
- `npm run custom-elements-manifest`: succeeded with existing analyzer
  dependency-resolution warnings. Semantic module comparison against HEAD
  confirmed only the four editor-related records changed/appeared.
- `npm run bundle` and session-only `files/verify-editor-stories.mjs`:
  Storybook build and all seven stories passed real Chromium checks, including
  host-echoed typing for both editors, inherited namespace conversion,
  toolbar/search accessible controls, validator, malformed and empty values.
- Clean package build plus
  `npm pack --ignore-scripts --pack-destination <session>/files --json`:
  verified both scoped/global SCL entries, Ace and XML worker in the package.
- In this plugin, a temporary
  `npm install --no-save --package-lock=false --ignore-scripts <local-tarball>`
  verified the reconciled Ace build. `node_modules/.bin/tsc --noEmit --incremental false`,
  `npm test` (nine tests in each browser, 27 executions), `npm run bundle`,
  and `files/verify-ace.mjs dev` / `files/verify-ace.mjs bundle` passed.
  Actual demos verified loading/layout, settings/theme persistence, worker
  errors and cross-origin bundled worker loading.
- Restored this plugin with `npm ci --ignore-scripts`; installed UI is again
  published 0.1.2. Lint, type-check and diff whitespace check passed afterward.
  The restored published package still has the known Ace bugs; browser success
  above applies to the local reconciled build, not published 0.1.2.
- Temporary servers and browsers were stopped. Dependency audit warnings were
  not treated as reviewed vulnerabilities or fixed as unrelated scope.

### Remaining integration and release gate

The editor port is uncommitted in `../oscd-ui`'s existing main worktree, not a
merge of the full feature branch. Local main is three fetched commits behind
origin/main (release/dependency changes). Review the editor diff and explicitly
agree Git integration before staging/committing or incorporating those commits.
Publishing/pushing is not authorized. The source plugin remains on published
`^0.1.2`; adopt a release containing these fixes before declaring it release-ready.

## Step 2 Completion Summary

### Integration defects found during browser verification (fixed in local source)

1. **Typed text overwritten:** oscd-ui's input synchronization scheduled a
   delayed full reinitialization using an older text snapshot. In
   `../oscd-ui/ace-editor/internal/ace-editor-base/AceEditorBase.ts`, attribute
   notifications now share the property-notification path, which ignores
   `value` updates already matching the live buffer (including an empty value).
   External value replacements remain supported.
2. **Cursor reset on input echoes:** the wrapper's delayed cursor reset also
   ran when user input was echoed through `value`. In
   `../oscd-ui/ace-editor/internal/AceEditor.ts`, programmatic replacements now
   use the base's existing start-of-buffer mode instead. Removed the timer and
   the plugin's temporary dual-buffer workaround; live typing keeps its cursor.
3. **Wrapper spec did not instantiate the component:** its import was used
   only as a type and removed by compilation. The spec now imports the bare
   class and registers it explicitly with `defineCE`.

### Files transformed

- `src/oscd-editor-source.ts` — corrected the Ace-wrapper export path, delegated
  settings/theme ownership to oscd-ui, removed obsolete host cursor timers,
  made dirty state reactive, and synchronized doc/docVersion changes while
  retaining editCount compatibility.
- `src/oscd-editor-source.spec.ts` — nine integration tests cover initial and
  late loading, typing/Apply, opaque version updates (including unchanged XML
  over a draft), document switches/closing, formatting, folding/search,
  settings persistence/menu and real XML-worker annotations.
- `rollup.config.js` — removed obsolete Ace directory copies; the existing
  import-meta-assets plugin emits the worker asset for both bundle entrypoints.
- `../oscd-ui/ace-editor/internal/ace-editor-base/AceEditorBase.ts` and
  `../oscd-ui/ace-editor/internal/AceEditor.ts` — upstream typing/cursor fixes.
- `../oscd-ui/ace-editor/OscdAceEditor.spec.ts` — programmatic replacement and
  input-echo cursor regressions.

### Files created

- `../oscd-ui/ace-editor/internal/ace-editor-base/AceEditorBase.spec.ts` —
  deterministic nonempty/empty-buffer data-loss regressions and external
  property/attribute replacement coverage.

### Verification

- In `../oscd-ui`, `npm run build`: passed. Before the fix,
  `node_modules/.bin/web-test-runner --files dist/ace-editor/internal/ace-editor-base/AceEditorBase.spec.js`
  failed both data-loss regressions and passed the external-update test.
- After the fix,
  `node_modules/.bin/web-test-runner --files dist/ace-editor/internal/ace-editor-base/AceEditorBase.spec.js dist/ace-editor/OscdAceEditor.spec.js`:
  five tests passed in Chromium.
- In `../oscd-ui`,
  `node_modules/.bin/eslint ace-editor/internal/ace-editor-base/AceEditorBase.ts ace-editor/internal/ace-editor-base/AceEditorBase.spec.ts ace-editor/internal/AceEditor.ts ace-editor/OscdAceEditor.spec.ts`
  and `git --no-pager diff --check`: passed.
- Used `npm pack --ignore-scripts --pack-destination <session>/files --json`
  and `npm install --no-save --package-lock=false --ignore-scripts <local-tarball>`
  to test the fixed build without changing this plugin's package manifests.
  The sibling's package version remains 0.1.1; its Ace source matches 0.1.2
  apart from the fixes. No release/version bump was made.
- With that local package, `node_modules/.bin/tsc --noEmit --incremental false`,
  `npm test` and `npm run bundle`: passed. All nine plugin tests passed in
  Chromium, Firefox and WebKit (27 executions).
- Session-only browser verifier `files/verify-ace.mjs`:
  `node <session>/files/verify-ace.mjs bundle` and
  `npm run build && node <session>/files/verify-ace.mjs dev` passed against the
  fixed local package. Verified the actual shell demos, document loading,
  nonzero editor height, settings menu, theme/font persistence across reloads
  and XML worker errors. Bundled plugin/worker also passed from a separate
  origin with a CORS-enabled asset server. Servers/browsers stopped afterward.
- Restored this repo's locked dependencies with `npm ci --ignore-scripts`;
  installed oscd-ui is again published 0.1.2. `npm run lint`,
  `node_modules/.bin/tsc --noEmit --incremental false` and
  `git --no-pager diff --check` passed afterward. Browser tests were not rerun
  against the known-broken published package; the 27-test success applies only
  to the fixed local build.
- Temporary no-save installation re-resolved some development dependencies,
  briefly exposing a formatting-check difference in the untouched legacy theme
  file. Restoring the lockfile installation resolved it; that file was not edited.
- The final locked install reported 47 npm audit alerts (7 low, 12 moderate,
  25 high, 3 critical). These are dependency-tool reports, not assessed
  exploitability findings; no audit fixes or unrelated upgrades were applied.

### Dead code after Step 2

- `src/ace-theme-oscd.ts` remains unreferenced because the oscd-ui wrapper owns
  the theme. Defer its removal to the requested repository refresh.

### Remaining release gate

Publish the oscd-ui source fixes, then update/install that published version
here and rerun the integration checks. A clean install of current 0.1.2 still
contains the data-loss and cursor-reset defects; do not mark the overall Ace
migration ready for release yet. No source-editor dependency declarations,
Git staging/history/configuration or remotes were changed by this work.
Tooling/menu-commons and validation remain untouched.

## Step 1 Completion Summary

### Files transformed

- `worklog.md` rewritten and moved from `../oscd-menu-validate` to this repo;
  replaces the menu-centred plan with a schema-first source-editor experiment.
- No application code, dependencies, or pre-existing changes modified.

### Verification

- `git --no-pager status --short` in the menu repo and
  `git -C /home/steren00/code/OmicronEnergyOSS/oscd-editor-source --no-pager status --short`
  confirmed the starting changes; no existing destination worklog was found.
- Documentation only: no builds or tests run. Earlier assessment/probe findings
  above are retained evidence, not newly executed validation.
