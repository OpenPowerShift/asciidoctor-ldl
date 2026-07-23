// Tests for the bundled Node render helper (lib/asciidoctor/ldl/js/ldl_render.mjs).
// Run with:  node --test   (from this directory, after `npm install`).
//
// The LDL package and @resvg/resvg-js are resolved from this directory's
// node_modules, so the helper is exercised exactly as the gem invokes it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, '..', '..', 'lib', 'asciidoctor', 'ldl', 'js', 'ldl_render.mjs');
const PKG_DIR = here; // node_modules with the LDL package + resvg live here

function run(args, input) {
  // No `encoding` → stdout/stderr come back as Buffers (what we want for PNG).
  return spawnSync('node', [SCRIPT, ...args, '--package-dir', PKG_DIR], { input });
}

function tmpOut(ext) {
  return join(mkdtempSync(join(tmpdir(), 'ldl-js-')), `out.${ext}`);
}

const resvgAvailable = existsSync(join(PKG_DIR, 'node_modules', '@resvg', 'resvg-js'));

test('renders SVG with scaled width/height and a viewBox', () => {
  const out = tmpOut('svg');
  const r = run(['--format', 'svg', '--scale', '2', '--out', out], 'O1 = I1 AND NOT I2');
  assert.equal(r.status, 0, r.stderr.toString());
  const svg = readFileSync(out, 'utf8');
  assert.match(svg, /<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const vbW = Number(svg.match(/viewBox="0 0 ([\d.]+) /)[1]);
  const w = Number(svg.match(/<svg width="([\d.]+)"/)[1]);
  assert.ok(Math.abs(w - vbW * 2) < 0.5, `width ${w} should be 2x viewBox ${vbW}`);
});

test('honours the dark theme flag', () => {
  const light = tmpOut('svg');
  const dark = tmpOut('svg');
  run(['--format', 'svg', '--theme', 'light', '--out', light], 'O1 = I1 AND I2');
  run(['--format', 'svg', '--theme', 'dark', '--out', dark], 'O1 = I1 AND I2');
  assert.notEqual(readFileSync(light, 'utf8'), readFileSync(dark, 'utf8'));
});

test('--font-family rewrites the generic sans-serif family', () => {
  const out = tmpOut('svg');
  const r = run(['--format', 'svg', '--font-family', 'DejaVu Sans, sans-serif', '--out', out], 'O1 = I1 AND I2');
  assert.equal(r.status, 0, r.stderr.toString());
  const svg = readFileSync(out, 'utf8');
  assert.match(svg, /font-family="DejaVu Sans, sans-serif"/);
  assert.doesNotMatch(svg, /font-family="sans-serif"/);
});

test('without --font-family the family is left untouched', () => {
  const out = tmpOut('svg');
  run(['--format', 'svg', '--out', out], 'O1 = I1 AND I2');
  assert.match(readFileSync(out, 'utf8'), /font-family="sans-serif"/);
});

test('reports parse errors and exits non-zero', () => {
  const out = tmpOut('svg');
  const r = run(['--format', 'svg', '--out', out], 'O1 = = AND');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr.toString(), /parse error/i);
});

test('rejects an unknown format', () => {
  const r = run(['--format', 'gif', '--out', tmpOut('gif')], 'O1 = I1');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr.toString(), /unsupported --format/);
});

test('PNG output has the PNG signature', { skip: !resvgAvailable }, () => {
  const out = tmpOut('png');
  const r = run(['--format', 'png', '--scale', '2', '--out', out], 'O1 = I1 AND I2');
  assert.equal(r.status, 0, r.stderr.toString());
  const sig = readFileSync(out).subarray(0, 4);
  assert.deepEqual([...sig], [0x89, 0x50, 0x4e, 0x47]);
});
