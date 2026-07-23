// End-to-end tests for the Node extension against @asciidoctor/core, mirroring
// the Ruby test suite. Runs against the built bundle (dist/node/index.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Extensions, convert } from '@asciidoctor/core';
import ldl from '../dist/node/index.js';

const jsDir = dirname(dirname(fileURLToPath(import.meta.url))); // the js/ package dir
const resvgAvailable = existsSync(join(jsDir, 'node_modules', '@resvg', 'resvg-js'));

function render(body, attrs = {}) {
  const outdir = mkdtempSync(join(tmpdir(), 'ldl-js-'));
  const registry = Extensions.create();
  ldl.register(registry);
  const out = convert(body, {
    extension_registry: registry,
    standalone: false,
    safe: 'unsafe',
    attributes: {
      imagesdir: 'images',
      outdir,
      'ldl-package-dir': jsDir,
      ...attrs,
    },
  });
  return Promise.resolve(out).then((html) => ({ html, images: join(outdir, 'images'), outdir }));
}

test('renders an inline block to SVG with roles and a file', async () => {
  const { html, images } = await render('[ldl]\n----\nO1.Name="Trip"\nO1 = I1 AND NOT I2\n----');
  assert.match(html, /<div class="imageblock ldl ldl-svg ldl-light/);
  assert.match(html, /<img[^>]+src="images\/ldl-[0-9a-f]+\.svg"/);
  const svgs = readdirSync(images).filter((f) => f.endsWith('.svg'));
  assert.equal(svgs.length, 1);
  const svg = readFileSync(join(images, svgs[0]), 'utf8');
  assert.match(svg, /<svg/);
  assert.match(svg, /viewBox/);
});

test('named target, scale and dark theme', async () => {
  const { images } = await render('[ldl,my-diagram,svg,scale=2,theme=dark]\n----\nO1 = I1 AND I2\n----');
  const path = join(images, 'my-diagram.svg');
  assert.ok(existsSync(path), 'expected my-diagram.svg');
  const svg = readFileSync(path, 'utf8');
  const vb = Number(svg.match(/viewBox="0 0 ([\d.]+) /)[1]);
  const w = Number(svg.match(/<svg width="([\d.]+)"/)[1]);
  assert.ok(Math.abs(w - vb * 2) < 0.5, `width ${w} should be 2x viewBox ${vb}`);
});

test('show-ids and show-labels change the output', async () => {
  const base = await render('[ldl,a]\n----\nO1.Name="Trip"\nO1 = I1 AND I2\n----');
  const ids = await render('[ldl,b,show-ids=true]\n----\nO1.Name="Trip"\nO1 = I1 AND I2\n----');
  const none = await render('[ldl,c,show-labels=false]\n----\nO1.Name="Trip"\nO1 = I1 AND I2\n----');
  const read = (r, n) => readFileSync(join(r.images, `${n}.svg`), 'utf8');
  assert.notEqual(read(base, 'a'), read(ids, 'b'));
  assert.notEqual(read(base, 'a'), read(none, 'c'));
});

test('font-family default stack is applied; override honoured; sans-serif disables', async () => {
  const def = await render('[ldl,d]\n----\nO1 = I1 AND I2\n----');
  assert.match(readFileSync(join(def.images, 'd.svg'), 'utf8'), /font-family="DejaVu Sans, [^"]*sans-serif"/);
  const custom = await render('[ldl,e,font-family="Fira Sans, sans-serif"]\n----\nO1 = I1 AND I2\n----');
  assert.match(readFileSync(join(custom.images, 'e.svg'), 'utf8'), /font-family="Fira Sans, sans-serif"/);
  const off = await render('[ldl,f,font-family=sans-serif]\n----\nO1 = I1 AND I2\n----');
  assert.match(readFileSync(join(off.images, 'f.svg'), 'utf8'), /font-family="sans-serif"/);
});

test('PNG output has the PNG signature', { skip: !resvgAvailable }, async () => {
  const { images } = await render('[ldl,gate,png]\n----\nO1 = I1 AND I2\n----');
  const path = join(images, 'gate.png');
  assert.ok(existsSync(path));
  assert.deepEqual([...readFileSync(path).subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});

test('block macro reads an LDL file', async () => {
  const outdir = mkdtempSync(join(tmpdir(), 'ldl-js-'));
  writeFileSync(join(outdir, 'trip.ldl'), 'O1.Name="Trip"\nO1 = I1 AND NOT I2\n');
  const registry = Extensions.create();
  ldl.register(registry);
  let out = convert('ldl::trip.ldl[format=svg]', {
    extension_registry: registry, standalone: false, safe: 'unsafe',
    base_dir: outdir,
    attributes: { imagesdir: 'images', outdir, docdir: outdir, 'ldl-package-dir': jsDir },
  });
  out = await Promise.resolve(out);
  assert.match(out, /<img[^>]+src="images\/trip\.svg"/);
  assert.ok(existsSync(join(outdir, 'images', 'trip.svg')));
});

test('sizing attributes (pdfwidth/scaledwidth/width) pass through', async () => {
  const { html } = await render('[ldl,sized,svg,pdfwidth=80%,scaledwidth=6cm,width=300]\n----\nO1 = A AND B\n----');
  // width renders as an <img width> attribute in HTML; pdfwidth/scaledwidth are
  // carried on the node (asserted via the image markup for width).
  assert.match(html, /<img[^>]+width="300"/);
});

test('invalid source yields a visible error block, not a crash', async () => {
  const { html } = await render('[ldl]\n----\nO1 = = AND\n----');
  assert.match(html, /listingblock ldl-error/);
  assert.match(html, /LDL diagram error/);
});

test('caching: a second run reuses the file (mtime unchanged)', async () => {
  const outdir = mkdtempSync(join(tmpdir(), 'ldl-js-'));
  const body = '[ldl,cached]\n----\nO1 = I1 AND I2\n----';
  const opts = () => {
    const registry = Extensions.create();
    ldl.register(registry);
    return convert(body, {
      extension_registry: registry, standalone: false, safe: 'unsafe',
      attributes: { imagesdir: 'images', outdir, 'ldl-package-dir': jsDir },
    });
  };
  await Promise.resolve(opts());
  const path = join(outdir, 'images', 'cached.svg');
  const first = statSync(path).mtimeMs;
  await Promise.resolve(opts());
  assert.equal(statSync(path).mtimeMs, first, 'file should not be rewritten on a cache hit');
});
