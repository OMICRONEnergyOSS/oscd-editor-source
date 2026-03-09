import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: `src/oscd-editor-source.ts`,
    output: {
      sourcemap: true, // Add source map to build output
      format: 'es', // ES module type export
      dir: 'dist', // The build output folder
      // preserveModules: true, // Keep directory structure and files
    },
    preserveEntrySignatures: 'strict', // leaves export of the plugin entry point

    plugins: [
      copy({
        targets: [
          {
            src: 'node_modules/ace-builds/src-noconflict/*.js',
            dest: 'dist/ace',
            verbose: true,
            flatten: true,
          },
          // Add more patterns if you have more assets
        ],
      }),
      /** Resolve bare module imports */
      nodeResolve(),

      typescript(),

      /** Bundle assets references via import.meta.url */
      importMetaAssets(),
    ],
  },
  {
    input: 'demo/index.html',
    plugins: [
      html({
        input: 'demo/index.html',
        minify: true,
      }),
      /** Resolve bare module imports */
      nodeResolve(),

      /** Bundle assets references via import.meta.url */
      importMetaAssets(),

      copy({
        targets: [
          { src: 'demo/sample.scd', dest: 'dist/demo' },
          { src: 'demo/*.js', dest: 'dist/demo' },
        ],
        verbose: true,
        flatten: false,
      }),

      copy({
        targets: [
          {
            src: 'node_modules/ace-builds/src-noconflict/*.js',
            dest: 'dist/demo/ace',
          },
        ],
        verbose: true,
        flatten: true,
      }),
    ],
    output: {
      dir: 'dist/demo',
      format: 'es',
      sourcemap: true,
    },
  },
];
