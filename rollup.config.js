import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import copy from 'rollup-plugin-copy';
import fs from 'fs';

const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
const demoTsconfig = {
  ...tsconfig,
  compilerOptions: { ...tsconfig.compilerOptions, outDir: 'dist/demo' },
};

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const name = packageJson.name.split('/').pop();

export default [
  {
    input: `${name}.ts`,
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
            src: 'node_modules/ace-builds/src-noconflict/worker-xml.js',
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

      typescript(demoTsconfig),

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
            src: 'node_modules/ace-builds/src-noconflict/worker-xml.js',
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
