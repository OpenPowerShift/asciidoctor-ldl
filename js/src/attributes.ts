// Translate block/document attributes into a RenderRequest and image markup,
// using the same precedence and defaults as the Ruby extension so both behave
// identically: block attribute wins, then the `ldl-`-prefixed document
// attribute, then the default.

import { normalizeFontFamily, normalizeScale } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import type { AdocDocument, OutputFormat, RenderRequest } from './types.js';

type Attrs = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

/** Block attribute, then document `ldl-*` attribute, then default. */
export function attr(
  attrs: Attrs,
  doc: AdocDocument,
  blockKey: string,
  docKey: string,
  def: string | null,
): string | null {
  let v: unknown = attrs[blockKey];
  if (isEmpty(v)) v = doc.getAttribute(docKey);
  return isEmpty(v) ? def : String(v);
}

export function truthy(value: unknown, def: boolean): boolean {
  if (isEmpty(value)) return def;
  if (value === true || value === false) return value;
  return ['true', '1', 'yes', 'on', ''].includes(String(value).trim().toLowerCase());
}

export function cacheEnabled(doc: AdocDocument): boolean {
  const raw = doc.getAttribute('ldl-cache');
  if (isEmpty(raw)) return true;
  return !['false', '0', 'no', 'off'].includes(String(raw).trim().toLowerCase());
}

export function packageDir(doc: AdocDocument): string | null {
  const v = doc.getAttribute('ldl-package-dir') || doc.getAttribute('ldl-node-modules');
  return isEmpty(v) ? null : String(v);
}

function normalizeFormat(value: string | null): OutputFormat {
  const fmt = String(value || 'svg').toLowerCase();
  if (fmt !== 'svg' && fmt !== 'png') {
    throw new Error(`unsupported format '${fmt}' (expected one of: svg, png)`);
  }
  return fmt;
}

/** Build the render request from resolved attributes. */
export function toRenderRequest(attrs: Attrs, doc: AdocDocument): RenderRequest {
  return {
    source: '', // filled in by the caller
    format: normalizeFormat(attr(attrs, doc, 'format', 'ldl-format', 'svg')),
    scale: normalizeScale(attr(attrs, doc, 'scale', 'ldl-scale', null) ?? undefined),
    theme: String(attr(attrs, doc, 'theme', 'ldl-theme', 'light')).toLowerCase(),
    showIds: truthy(attr(attrs, doc, 'show-ids', 'ldl-show-ids', null), false),
    showLabels: truthy(attr(attrs, doc, 'show-labels', 'ldl-show-labels', null), true),
    fontFamily: normalizeFontFamily(attr(attrs, doc, 'font-family', 'ldl-font-family', null)),
    packageDir: packageDir(doc),
  };
}

// Image attributes forwarded to the generated image (matches the Ruby list),
// including the sizing attributes for each backend.
const IMAGE_PASSTHROUGH = [
  'alt', 'title', 'width', 'height', 'pdfwidth', 'scaledwidth',
  'align', 'float', 'id', 'link', 'window', 'opts', 'fit',
];

export function passthroughImageAttrs(attrs: Attrs): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of IMAGE_PASSTHROUGH) {
    if (!isEmpty(attrs[key])) out[key] = String(attrs[key]);
  }
  return out;
}

/** Stable roles for CSS / asciidoctor-pdf theming, preserving any author role. */
export function imageRoles(attrs: Attrs, format: OutputFormat, theme: string): string {
  const roles = ['ldl', `ldl-${format}`, `ldl-${theme}`];
  const author = attrs['role'];
  if (!isEmpty(author)) roles.push(...String(author).split(/\s+/));
  return [...new Set(roles)].join(' ');
}

/** A safe output basename (no path traversal), matching the Ruby sanitiser. */
export function sanitizeBasename(basename: string): string {
  const base = basename.replace(/^.*[\\/]/, ''); // strip any directory
  return base.replace(/[^\w.-]+/g, '_').replace(/\.(svg|png)$/i, '');
}
