// Parity tests: render the same LDL with identical options through both the
// Ruby gem (asciidoctor CLI) and the JS extension, and assert the generated
// files are byte-identical and share the same content-hash name. This is the
// guarantee that "identical output with Asciidoctor.js as with Ruby" holds.
//
// Skips cleanly when the Ruby `asciidoctor` CLI or the asciidoctor-ldl gem is
// not available (e.g. a JS-only environment).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Extensions, convert } from '@asciidoctor/core';
import ldl from '../dist/node/index.js';

const jsDir = dirname(dirname(fileURLToPath(import.meta.url)));

function rubyAvailable() {
  const probe = spawnSync('asciidoctor', ['-r', 'asciidoctor-ldl', '--version'], { encoding: 'utf8' });
  return probe.status === 0;
}

const available = rubyAvailable();

function renderRuby(body, outdir) {
  writeFileSync(join(outdir, 'doc.adoc'), body);
  const res = spawnSync(
    'asciidoctor',
    ['-r', 'asciidoctor-ldl', '-a', `ldl-package-dir=${jsDir}`, '-a', 'imagesdir=.', '-D', outdir, join(outdir, 'doc.adoc')],
    { encoding: 'utf8', env: { ...process.env, LDL_PACKAGE_DIR: jsDir } },
  );
  assert.equal(res.status, 0, `ruby render failed: ${res.stderr}`);
}

async function renderJs(body, outdir) {
  const registry = Extensions.create();
  ldl.register(registry);
  let out = convert(body, {
    extension_registry: registry, standalone: false, safe: 'unsafe',
    attributes: { imagesdir: '.', outdir, 'ldl-package-dir': jsDir },
  });
  await Promise.resolve(out);
}

const CASES = [
  ['default', '[ldl]\n----\nO1.Name="Trip"\nO1 = I1 AND NOT I2\n----'],
  ['scale', '[ldl,,svg,scale=1.5]\n----\nO1 = A AND B OR C\n----'],
  ['dark', '[ldl,,svg,theme=dark]\n----\nO1 = A AND NOT B\n----'],
  ['show-ids', '[ldl,,svg,show-ids=true]\n----\nO1.Name="T"\nO1 = I1 AND I2\n----'],
  ['font', '[ldl,,svg,font-family=Fira Sans]\n----\nO1 = I1 AND I2\n----'],
  ['blocks', '[ldl]\n----\nOPTION INVERSION = BUBBLES\nTRIP = OC AND NOT BLK\n----'],
];

for (const [name, body] of CASES) {
  test(`Ruby and JS produce identical SVG: ${name}`, { skip: !available && 'ruby asciidoctor-ldl not available' }, async () => {
    const rubyDir = mkdtempSync(join(tmpdir(), 'ldl-ruby-'));
    const jsDir2 = mkdtempSync(join(tmpdir(), 'ldl-js-'));
    renderRuby(body, rubyDir);
    await renderJs(body, jsDir2);
    const rubySvgs = readdirSync(rubyDir).filter((f) => f.endsWith('.svg')).sort();
    const jsSvgs = readdirSync(jsDir2).filter((f) => f.endsWith('.svg')).sort();
    assert.deepEqual(jsSvgs, rubySvgs, 'file names must match');
    assert.equal(rubySvgs.length, 1);
    const rubyBytes = readFileSync(join(rubyDir, rubySvgs[0]));
    const jsBytes = readFileSync(join(jsDir2, jsSvgs[0]));
    assert.ok(rubyBytes.equals(jsBytes), 'SVG bytes must be identical');
  });
}
