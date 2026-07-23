#!/usr/bin/env node
// ldl_render.mjs — render LDL source to SVG or PNG for the asciidoctor-ldl gem.
//
// Contract (kept deliberately small so the Ruby side is easy to drive):
//   * LDL source is read from stdin.
//   * Options come from CLI flags (see parseArgs below).
//   * The rendered artifact is written to the path given by --out.
//   * On success nothing is written to stdout; a one-line JSON summary
//     ({"format","width","height","out"}) is written to stderr for logging.
//   * On failure a human-readable message is written to stderr and the
//     process exits non-zero.
//
// SVG rendering is isomorphic (only needs @openpowershift/logic-diagram-language).
// PNG rendering additionally needs @resvg/resvg-js, resolved lazily so an
// SVG-only install never has to have it present.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, isAbsolute } from 'node:path';

const PACKAGE = '@openpowershift/logic-diagram-language';

// Resolve an installed package's ESM entry point from a base directory,
// without relying on a `require` export condition (the LDL package is
// ESM-only, so `require.resolve(pkg)` throws ERR_PACKAGE_PATH_NOT_EXPORTED).
// The `./package.json` subpath *is* exported, so resolve that and read the
// declared entry ourselves. Returns a file:// URL string, or null.
function resolveEntryFrom(base, pkg) {
  let pkgJsonPath;
  try {
    const req = createRequire(pathToFileURL(join(base, 'package.json')).href);
    pkgJsonPath = req.resolve(`${pkg}/package.json`);
  } catch (_) {
    return null;
  }
  const meta = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const dot = meta.exports && meta.exports['.'];
  const entry =
    (dot && typeof dot === 'object' && (dot.import || dot.default)) ||
    (typeof dot === 'string' ? dot : null) ||
    meta.module ||
    meta.main ||
    'index.js';
  return pathToFileURL(resolve(dirname(pkgJsonPath), entry)).href;
}

// Candidate base directories to search, in priority order.
function candidateBases(packageDir) {
  const bases = [];
  if (packageDir) bases.push(packageDir);
  if (process.env.LDL_PACKAGE_DIR) bases.push(process.env.LDL_PACKAGE_DIR);
  bases.push(process.cwd());
  bases.push(dirname(fileURLToPath(import.meta.url)));
  return bases;
}

function parseArgs(argv) {
  const opts = {
    format: 'svg',
    scale: 1,
    theme: 'light',
    showIds: false,
    showLabels: true,
    out: null,
    packageDir: null,
    fontFamily: null,
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
      case '--out': opts.out = next(); break;
      case '--package-dir': opts.packageDir = next(); break;
      case '--font-family': opts.fontFamily = next(); break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!opts.out) throw new Error('missing required --out <path>');
  if (!Number.isFinite(opts.scale) || opts.scale <= 0) {
    throw new Error(`invalid --scale: ${opts.scale}`);
  }
  if (opts.format !== 'svg' && opts.format !== 'png') {
    throw new Error(`unsupported --format: ${opts.format} (expected svg or png)`);
  }
  return opts;
}

// Resolve the LDL package from a set of candidate base directories, so it can
// live in the user's project, a globally installed location, or a checkout
// pointed at by --package-dir / LDL_PACKAGE_DIR.
async function loadLibrary(packageDir) {
  const tried = [];
  for (const base of candidateBases(packageDir)) {
    // Allow a base that points straight at a package checkout (…/lib/index.js).
    for (const direct of [join(base, 'lib', 'index.js'), join(base, 'index.js')]) {
      try {
        return await import(pathToFileURL(direct).href);
      } catch (e) { tried.push(`${direct} (${e.code || 'error'})`); }
    }
    // Otherwise resolve it as an installed dependency from that base.
    const entry = resolveEntryFrom(base, PACKAGE);
    if (entry) {
      try {
        return await import(entry);
      } catch (e) { tried.push(`${entry} (${e.code || 'error'})`); }
    } else {
      tried.push(`${base}:${PACKAGE} (not found)`);
    }
  }
  throw new Error(
    `could not resolve ${PACKAGE}.\n` +
    `Install it where your document is built, e.g.\n` +
    `  npm install ${PACKAGE}\n` +
    `or point the ldl-package-dir attribute / LDL_PACKAGE_DIR env var at it.\n` +
    `Searched:\n  ${tried.join('\n  ')}`);
}

async function loadResvg(packageDir) {
  for (const base of candidateBases(packageDir)) {
    try {
      const req = createRequire(pathToFileURL(join(base, 'package.json')).href);
      return await import(pathToFileURL(req.resolve('@resvg/resvg-js')).href);
    } catch (_) { /* try next */ }
    const entry = resolveEntryFrom(base, '@resvg/resvg-js');
    if (entry) {
      try { return await import(entry); } catch (_) { /* try next */ }
    }
  }
  throw new Error(
    'PNG output needs @resvg/resvg-js, which was not found.\n' +
    'Install it alongside the LDL package:\n' +
    '  npm install @resvg/resvg-js\n' +
    'or use format=svg (the default), which needs no extra dependency and is\n' +
    'ideal for asciidoctor-pdf (vector, scalable, compact).');
}

// The renderer emits <svg viewBox="0 0 W H" …> with no intrinsic width/height.
// Add them (scaled) so downstream consumers — prawn-svg in asciidoctor-pdf,
// browsers, resvg — get a concrete size and the scale attribute is honoured.
function sizeFromViewBox(svg) {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) return null;
  return { width: parseFloat(m[1]), height: parseFloat(m[2]) };
}

// The renderer tags diagram text with font-family="sans-serif". Some consumers
// map that generic family to a glyph-poor built-in font (e.g. prawn-svg in
// asciidoctor-pdf uses Helvetica, which lacks − U+2212 and ≥ U+2265). Rewriting
// it to a named font that the consumer has registered fixes those glyphs.
function applyFontFamily(svg, family) {
  if (!family) return svg;
  const q = family.replace(/"/g, '&quot;');
  return svg
    .replace(/font-family="sans-serif"/g, `font-family="${q}"`)
    .replace(/font-family:\s*sans-serif/g, `font-family:${family}`);
}

function applySvgScale(svg, scale) {
  const size = sizeFromViewBox(svg);
  if (!size) return { svg, size };
  const w = size.width * scale;
  const h = size.height * scale;
  // Insert width/height right after "<svg"; drop the max-width/height clamp so
  // an explicit size actually takes effect when embedded as an image.
  const scaled = svg
    .replace(/<svg/, `<svg width="${w}" height="${h}"`)
    .replace(/\s*max-width:100%;max-height:100%;/, '');
  return { svg: scaled, size: { width: w, height: h } };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const source = readFileSync(0, 'utf8'); // fd 0 = stdin

  const lib = await loadLibrary(opts.packageDir);
  const { parse, renderDiagram, resolveOptions, LIGHT_DIAGRAM, DARK_DIAGRAM } = lib;

  const { diagram, errors } = parse(source);
  if (errors && errors.length) {
    const lines = errors.map((e) => {
      const pos = e.position ? ` (line ${e.position.line}, col ${e.position.column})` : '';
      return `  ${e.message}${pos}`;
    });
    throw new Error(`LDL parse error:\n${lines.join('\n')}`);
  }

  const renderOptions = resolveOptions(diagram.options);
  renderOptions.showIds = opts.showIds;
  renderOptions.showLabels = opts.showLabels;
  const theme = opts.theme === 'dark' ? DARK_DIAGRAM : LIGHT_DIAGRAM;

  let svg = applyFontFamily(renderDiagram(diagram, renderOptions, theme), opts.fontFamily);
  const scaled = applySvgScale(svg, opts.scale);
  svg = scaled.svg;
  const size = scaled.size || { width: 0, height: 0 };

  const outPath = isAbsolute(opts.out) ? opts.out : join(process.cwd(), opts.out);

  if (opts.format === 'svg') {
    writeFileSync(outPath, svg, 'utf8');
    process.stderr.write(JSON.stringify({ format: 'svg', width: size.width, height: size.height, out: outPath }) + '\n');
    return;
  }

  // PNG
  const { Resvg } = await loadResvg(opts.packageDir);
  // Rasterise from the *unscaled* viewBox using resvg's own zoom, so the scale
  // multiplies device pixels crisply rather than baking a size into the SVG.
  const base = applyFontFamily(renderDiagram(diagram, renderOptions, theme), opts.fontFamily);
  const resvg = new Resvg(base, {
    fitTo: { mode: 'zoom', value: opts.scale },
    background: 'white',
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  writeFileSync(outPath, png);
  process.stderr.write(JSON.stringify({ format: 'png', width: rendered.width, height: rendered.height, out: outPath }) + '\n');
}

main().catch((err) => {
  process.stderr.write(`[asciidoctor-ldl] ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
