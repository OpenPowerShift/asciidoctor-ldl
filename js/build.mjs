// esbuild bundler: produces a single JS file per target.
//   dist/node/index.js   (ESM)  and  index.cjs (CommonJS)  — Node
//   dist/browser/index.js (ESM)                            — browser (SVG only)
//
// The LDL renderer, resvg and @asciidoctor/core stay external (runtime deps),
// so the bundle is just the extension glue plus the shared render core.

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

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

  // Standalone — a single self-contained CommonJS file with the LDL renderer
  // bundled in (nothing to npm-install). For drop-in use such as Asciidoctor
  // VS Code's .asciidoctor/lib. Only Node builtins stay external. The footer
  // makes `module.exports` itself the callable register function, so both
  // `require(file)(registry)` and `require(file).register(registry)` work.
  await build({
    entryPoints: ['src/standalone.ts'],
    outfile: 'dist/standalone/asciidoctor-ldl.cjs',
    bundle: true, platform: 'node', target: 'node18', format: 'cjs',
    external: [], // bundle everything except Node builtins (auto-external)
    define, banner, logLevel: 'info',
    footer: {
      js:
        ';(function(){if(typeof module!=="undefined"&&module.exports&&module.exports.register){' +
        'var f=module.exports.register;module.exports=f;f.register=f;f.default=f;}})();',
    },
  });
  // Marker so this file stays CommonJS even if copied under a type:module tree.
  writeFileSync('dist/standalone/package.json', JSON.stringify({ type: 'commonjs' }) + '\n');

  // Hand-written, self-contained public type declarations.
  mkdirSync('dist/types', { recursive: true });
  copyFileSync('types/node.d.ts', 'dist/types/node.d.ts');
  copyFileSync('types/browser.d.ts', 'dist/types/browser.d.ts');
  console.log('  dist/types/node.d.ts, dist/types/browser.d.ts');
}

run().catch((err) => { console.error(err); process.exit(1); });
