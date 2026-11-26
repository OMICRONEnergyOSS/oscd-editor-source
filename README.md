[![Tests](https://github.com/OMICRONEnergyOSS/oscd-editor-source/actions/workflows/test.yml/badge.svg)](https://github.com/OMICRONEnergyOSS/oscd-editor-source/actions/workflows/test.yml) ![NPM Version](https://img.shields.io/npm/v/@omicronenergy/oscd-editor-source)

# OpenSCD Source (Markup) Editor

OpenSCD Editor Plugin which allows users to view the raw IEC 61850 SCL Markup (and edit it).

## Supported Features

### Editing

This plugin allows users to change or add anything they want directly to the SCL source. Think of this as an alternative to opening the file in Notepad. However, changes made are NOT directly changing the underlying document for performance reasons. To commit changes to the source, click the "Apply" button. This means changes made within the editor can be undone (and redone) using the standard undo/redo functionality. So its best to click "Apply" more frequently, rather than once at the end of a large edit so "undo's" are more incremental.

### Formatting

OpenSCD plugins don't typically add formatted markup to the SCL files, ordinarilly there is no need for it. However, if you want to use this plugin to view source, this feature makes reading the SCL more managable. Formatting edits the SCL within the editor which will then be committed to the document if you click Apply. So if you don't want to change the format of the underlying document, don't apply after formatting.
If you don't want to change the format of the entire file, clicking Format with only some code selected, will format just that code. Care needs to be taken to select tags completely. Partially selecting the start but not the end of an SCL element will lead to unexpected results.

### Find and replace

You can use Find and Replace by using using Ctrl-F (find) and Ctrl-H (Find & Replace) or using the search button in the toolbar.

### Code folding

Code folding is supported out of the box. There are convienence toolbar actions to collapse all code (except for root) and to expand all code too.

### Commands

The editor uses Ace through oscd-ui's `OscdAceEditor`. With focus in the editor, press F1 to see the available commands or Ctrl+, to change settings such as the theme. Editor settings are persisted in local storage.

## `<oscd-editor-source>`

## What is this?

This is an [OpenSCD](https://openscd.org) plugin. Start up a demo server with `npm run start` and see for yourself!

## Development

Install dependencies with `npm install`. The prepare script generates `.githooks/`
and configures this repository to use them for staged-file linting and commit
message checks. When replacing an existing hooks path, review the old hooks
before running `npm run prepare -- --force`.

Build the plugin with `npm run build`, or create a deployable plugin and demo
bundle with `npm run bundle`.

### Linting

To check lint rules, including code style, run:

```bash
npm run lint
```

To apply automatic ESLint fixes, run:

```bash
npm run format
```

The shared configuration uses ESLint Stylistic rather than Prettier.

### Testing with Web Test Runner

Integration tests cover document loading and refresh, editing, Apply, invalid XML,
undo, toolbar actions and editor settings in Chromium, Firefox and WebKit.

To build and execute a single test run:

```bash
npm run test
```

To run the tests in interactive watch mode:

```bash
npm run test:watch
```

The Playwright browsers matching oscd-tooling's pinned version must be installed.
The tooling's `oscd install-playwright` command installs browsers and system
dependencies; on Linux it may require elevated permissions.

### Tooling configuration

Build, bundling, lint, test, development-server and hook commands delegate to
[`@omicronenergy/oscd-tooling`](https://github.com/OMICRONEnergyOSS/oscd-tooling)
through the `oscd` CLI. Shared configs live in that package, not in this repo.
The local TypeScript and ESLint configs extend those defaults. The small Web Test
Runner extension preserves three-browser coverage; the shared default runs
Chromium only.

Custom-elements manifest generation is not enabled for this plugin.

### Local demo

```bash
npm run start
```

This starts the development server for `demo/index.html`. Use
`npm run start:bundle` to serve the bundled demo instead.

&copy; 2025 OMICRON electronics GmbH

## License

[Apache-2.0](LICENSE)
