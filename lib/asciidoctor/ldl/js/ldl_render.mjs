#!/usr/bin/env node
// ldl_render.mjs — CLI wrapper the Ruby gem shells out to. It is a thin adapter
// over the shared render core (render-core.mjs) and Node loader
// (node-loader.mjs); the Asciidoctor.js extension uses the very same core, so
// both integrations emit byte-identical output.
//
// Contract (driven by lib/asciidoctor/ldl/renderer.rb):
//   * LDL source is read from stdin.
//   * Options come from CLI flags (see parseArgs).
//   * The rendered artifact is written to the path given by --out.
//   * On success a one-line JSON summary is written to stderr; on failure a
//     human-readable message is written to stderr and the process exits non-zero.

import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { renderSvg, renderBaseSvg, normalizeScale } from './render-core.mjs';
import { loadLibrary, rasterisePng } from './node-loader.mjs';

function parseArgs(argv) {
  const opts = {
    format: 'svg', scale: 1, theme: 'light',
    showIds: false, showLabels: true,
    fontFamily: null, out: null, packageDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--format': opts.format = String(next()).toLowerCase(); break;
      case '--scale': opts.scale = Number(next()); break;
      case '--theme': opts.theme = String(next()).toLowerCase(); break;
      case '--show-ids': opts.showIds = true; break;
      case '--no-show-ids': opts.showIds = false; break;
      case '--show-labels': opts.showLabels = true; break;
      case '--no-show-labels': opts.showLabels = false; break;
      case '--font-family': opts.fontFamily = next(); break;
      case '--out': opts.out = next(); break;
      case '--package-dir': opts.packageDir = next(); break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!opts.out) throw new Error('missing required --out <path>');
  normalizeScale(opts.scale); // validates
  if (opts.format !== 'svg' && opts.format !== 'png') {
    throw new Error(`unsupported --format: ${opts.format} (expected svg or png)`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const source = readFileSync(0, 'utf8'); // fd 0 = stdin
  const lib = await loadLibrary(opts.packageDir);
  const outPath = isAbsolute(opts.out) ? opts.out : join(process.cwd(), opts.out);

  if (opts.format === 'svg') {
    const { svg, width, height } = renderSvg(lib, { ...opts, source });
    writeFileSync(outPath, svg, 'utf8');
    process.stderr.write(JSON.stringify({ format: 'svg', width, height, out: outPath }) + '\n');
    return;
  }

  // PNG: rasterise the unscaled base SVG with resvg's zoom.
  const base = renderBaseSvg(lib, { ...opts, source });
  const { data, width, height } = await rasterisePng(base, normalizeScale(opts.scale), opts.packageDir);
  writeFileSync(outPath, data);
  process.stderr.write(JSON.stringify({ format: 'png', width, height, out: outPath }) + '\n');
}

main().catch((err) => {
  process.stderr.write(`[asciidoctor-ldl] ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
