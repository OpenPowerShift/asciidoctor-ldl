// Tests for the self-contained standalone build (SVG only, renderer bundled in,
// synchronous processors). This is the file dropped into Asciidoctor VS Code's
// .asciidoctor/lib without installing anything.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { Extensions, convert } from '@asciidoctor/core';

const require = createRequire(import.meta.url);
const standalone = require('../dist/standalone/asciidoctor-ldl.cjs');

test('exposes a register method (asciidoctor-vscode contract) and is callable', () => {
  assert.equal(typeof standalone.register, 'function');
  assert.equal(typeof standalone, 'function'); // footer makes module.exports callable
});

test('renders a diagram inline as SVG with roles, no external deps', async () => {
  const registry = Extensions.create();
  standalone.register(registry); // exactly how asciidoctor-vscode invokes it
  let out = convert('[ldl]\n----\nO1.Name="Trip"\nO1 = I1 AND NOT I2\n----', {
    extension_registry: registry, standalone: false, safe: 'safe',
  });
  out = await Promise.resolve(out);
  assert.match(out, /<div class="imageblock ldl ldl-svg ldl-light/);
  assert.match(out, /<svg/); // embedded inline, not an <img> reference
  assert.doesNotMatch(out, /<img/);
});

test('the bundled MathJax renders inline TeX labels', async () => {
  const registry = Extensions.create();
  standalone.register(registry);
  let out = convert('[ldl]\n----\nB = X\nX.Name = "$\\mathrm{|I1|}$"\nB.Name="BF"\n----', {
    extension_registry: registry, standalone: false, safe: 'safe',
  });
  out = await Promise.resolve(out);
  // A TeX label is rendered by MathJax into a nested <svg>, so there are two.
  assert.ok((out.match(/<svg/g) || []).length >= 2, 'expected a MathJax-rendered nested svg');
});

test('PNG is rejected with a clear error (standalone is SVG only)', async () => {
  const registry = Extensions.create();
  standalone.register(registry);
  let out = convert('[ldl,,png]\n----\nO1 = I1 AND I2\n----', {
    extension_registry: registry, standalone: false, safe: 'safe',
  });
  out = await Promise.resolve(out);
  assert.match(out, /ldl-error/);
  assert.match(out, /SVG only/);
});
