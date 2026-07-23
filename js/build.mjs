// esbuild bundler: produces a single JS file per target.
//   dist/node/index.js   (ESM)  and  index.cjs (CommonJS)  — Node
//   dist/browser/index.js (ESM)                            — browser (SVG only)
//
// The LDL renderer, resvg and @asciidoctor/core stay external (runtime deps),
// so the bundle is just the extension glue plus the shared render core.

import { build } from 'esbuild';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const define = { __LDL_VERSION__: JSON.stringify(pkg.version) };

const external = [
  '@openpowershift/logic-diagram-language',
  '@resvg/resvg-js',
  '@asciidoctor/core',
];

const banner = {
  js: `// @openpowershift/asciidoctor-ldl ${pkg.version} — https://github.com/OpenPowerShift/asciidoctor-ldl`,
};

async function run() {
  // Node — ESM
  await build({
    entryPoints: ['src/node.ts'],
    outfile: 'dist/node/index.js',
    bundle: true, platform: 'node', target: 'node18', format: 'esm',
    external, define, banner, logLevel: 'info',
  });
  // Node — CommonJS
  await build({
    entryPoints: ['src/node.ts'],
    outfile: 'dist/node/index.cjs',
    bundle: true, platform: 'node', target: 'node18', format: 'cjs',
    external, define, banner, logLevel: 'info',
  });
  // Browser — ESM (SVG only; LDL renderer supplied by the consumer's bundler)
  await build({
    entryPoints: ['src/browser.ts'],
    outfile: 'dist/browser/index.js',
    bundle: true, platform: 'browser', format: 'esm',
    external: ['@openpowershift/logic-diagram-language', '@asciidoctor/core'],
    define, banner, logLevel: 'info',
  });

  // Hand-written, self-contained public type declarations.
  mkdirSync('dist/types', { recursive: true });
  copyFileSync('types/node.d.ts', 'dist/types/node.d.ts');
  copyFileSync('types/browser.d.ts', 'dist/types/browser.d.ts');
  console.log('  dist/types/node.d.ts, dist/types/browser.d.ts');
}

run().catch((err) => { console.error(err); process.exit(1); });
