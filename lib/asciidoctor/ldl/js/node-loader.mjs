// node-loader.mjs — Node-only concerns for the LDL render core: resolving the
// LDL library and @resvg/resvg-js from a set of candidate directories, and
// rasterising SVG to PNG. Kept separate from render-core.mjs so the core stays
// environment-agnostic (usable in the browser).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const PACKAGE = '@openpowershift/logic-diagram-language';

// Resolve an installed package's ESM entry point from a base directory, without
// relying on a `require` export condition (the LDL package is ESM-only, so
// `require.resolve(pkg)` throws ERR_PACKAGE_PATH_NOT_EXPORTED). The
// `./package.json` subpath *is* exported, so resolve that and read the declared
// entry ourselves. Returns a file:// URL string, or null.
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

// The directory of this module, or null when unavailable (e.g. bundled into a
// CommonJS file where import.meta.url is empty).
function moduleDir() {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return null;
  }
}

function candidateBases(packageDir) {
  const bases = [];
  if (packageDir) bases.push(packageDir);
  if (process.env.LDL_PACKAGE_DIR) bases.push(process.env.LDL_PACKAGE_DIR);
  bases.push(process.cwd());
  const md = moduleDir();
  if (md) bases.push(md);
  return bases;
}

export async function loadLibrary(packageDir) {
  const tried = [];
  for (const base of candidateBases(packageDir)) {
    for (const direct of [join(base, 'lib', 'index.js'), join(base, 'index.js')]) {
      try {
        return await import(pathToFileURL(direct).href);
      } catch (e) { tried.push(`${direct} (${e.code || 'error'})`); }
    }
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

export async function loadResvg(packageDir) {
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

// Rasterise an SVG string to a PNG Buffer at `scale`× using resvg's zoom, so the
// scale multiplies device pixels crisply. Returns { data, width, height }.
export async function rasterisePng(baseSvg, scale, packageDir) {
  const { Resvg } = await loadResvg(packageDir);
  const resvg = new Resvg(baseSvg, {
    fitTo: { mode: 'zoom', value: scale },
    background: 'white',
  });
  const rendered = resvg.render();
  return { data: rendered.asPng(), width: rendered.width, height: rendered.height };
}
