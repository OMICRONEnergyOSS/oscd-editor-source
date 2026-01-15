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

The underlying editor used it here is the Ace Code editor. Which is very capable. When focus is on the editor, it F1 to see all of the available commands. It is also possible to change some settings with Ctrl+, such as changing the theme (although this is not currently persisted).

## `<oscd-editor-source>`

## What is this?

This is an [OpenSCD](https://openscd.org) plugin. Start up a demo server with `npm run start` and see for yourself!

## Linting and formatting

To scan the project for linting and formatting errors, run

```bash
npm run lint
```

To automatically fix linting and formatting errors, run

```bash
npm run format
```

## Testing with Web Test Runner

> This demo plugin does nothing much that could be tested as it relies exclusively on built-in browser components to do its job. We therefore currently have no tests. If you find something that could be tested, please feel free!

To execute a single test run:

```bash
npm run test
```

To run the tests in interactive watch mode run:

```bash
npm run test:watch
```

## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm run start
```

To run a local development server that serves the basic demo located in `demo/index.html`

&copy; 2025 OMICRON electronics GmbH

## License

[Apache-2.0](LICENSE)
