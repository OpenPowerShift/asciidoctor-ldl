// render-core.mjs — the environment-agnostic rendering core shared by the Ruby
// gem's Node helper, the Asciidoctor.js extension (Node), and the browser build.
//
// It has NO Node-specific imports on purpose, so the exact same code runs in
// every environment and both the Ruby and JavaScript integrations produce
// byte-identical SVG. Anything that needs the filesystem or module resolution
// lives in node-loader.mjs instead.
//
// The functions here take the *already-loaded* LDL library module
// (`@openpowershift/logic-diagram-language`) as their first argument, so this
// file never has to resolve or import it.

// Keep this in lockstep with the Ruby DEFAULT_FONT_FAMILY (renderer.rb) and the
// npm/gem version policy — see docs. Named real fonts first, ending in the
// generic so browsers/resvg still resolve it; deliberately omits the PDF
// built-ins so prawn-svg only uses one when it is actually registered.
export const DEFAULT_FONT_FAMILY =
  'DejaVu Sans, Bitstream Vera Sans, Liberation Sans, Arial, sans-serif';

export class LdlParseError extends Error {}

// The renderer tags diagram text font-family="sans-serif". Rewrite it to a named
// family so consumers that map the generic family to a glyph-poor font (e.g.
// prawn-svg → Helvetica, which lacks − U+2212 and ≥ U+2265) render correctly.
export function applyFontFamily(svg, family) {
  if (!family) return svg;
  const q = String(family).replace(/"/g, '&quot;');
  return svg
    .replace(/font-family="sans-serif"/g, `font-family="${q}"`)
    .replace(/font-family:\s*sans-serif/g, `font-family:${family}`);
}

export function sizeFromViewBox(svg) {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) return null;
  return { width: parseFloat(m[1]), height: parseFloat(m[2]) };
}

// Add explicit width/height (scaled from the viewBox) and drop the max-width
// clamp, so an embedded image honours the size while the viewBox keeps it crisp.
export function applySvgScale(svg, scale) {
  const size = sizeFromViewBox(svg);
  if (!size) return { svg, width: 0, height: 0 };
  const width = size.width * scale;
  const height = size.height * scale;
  const scaled = svg
    .replace(/<svg/, `<svg width="${width}" height="${height}"`)
    .replace(/\s*max-width:100%;max-height:100%;/, '');
  return { svg: scaled, width, height };
}

// Render LDL source to an SVG string at the diagram's intrinsic size (no scale
// applied), with the font family rewritten. This is the single rendering path;
// SVG output scales this, PNG output rasterises it.
export function renderBaseSvg(lib, opts) {
  const { parse, renderDiagram, resolveOptions, LIGHT_DIAGRAM, DARK_DIAGRAM } = lib;
  const { source, theme = 'light', showIds = false, showLabels = true, fontFamily = null } = opts;

  const { diagram, errors } = parse(source);
  if (errors && errors.length) {
    const lines = errors.map((e) => {
      const pos = e.position ? ` (line ${e.position.line}, col ${e.position.column})` : '';
      return `  ${e.message}${pos}`;
    });
    throw new LdlParseError(`LDL parse error:\n${lines.join('\n')}`);
  }

  const renderOptions = resolveOptions(diagram.options);
  renderOptions.showIds = showIds;
  renderOptions.showLabels = showLabels;
  const themeObj = String(theme).toLowerCase() === 'dark' ? DARK_DIAGRAM : LIGHT_DIAGRAM;

  return applyFontFamily(renderDiagram(diagram, renderOptions, themeObj), fontFamily);
}

// Render to a final SVG string (scaled). Returns { svg, width, height }.
export function renderSvg(lib, opts) {
  const scale = normalizeScale(opts.scale);
  return applySvgScale(renderBaseSvg(lib, opts), scale);
}

// --- shared option / identity helpers (must match the Ruby side) ------------

export function normalizeScale(scale) {
  const n = Number(scale == null || scale === '' ? 1 : scale);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`invalid scale: ${scale}`);
  return n;
}

// Canonical %g-style number, matching Ruby's sprintf('%g', n) for the value
// ranges scales take (no exponent for normal magnitudes): trailing zeros are
// dropped. Used in the content digest so filenames match across Ruby and JS.
export function canonicalScale(scale) {
  const n = normalizeScale(scale);
  if (Number.isInteger(n)) return String(n);
  // Round like %g's 6 significant digits, then strip trailing zeros.
  return parseFloat(n.toPrecision(6)).toString();
}

export function normalizeFontFamily(value) {
  if (value == null) return DEFAULT_FONT_FAMILY;
  const family = String(value).trim();
  if (family === '' || family.toLowerCase() === 'none' || family.toLowerCase() === 'sans-serif') {
    return null;
  }
  return family;
}

// The canonical material hashed to name the output file. MUST be identical to
// the Ruby Renderer#digest input so a given diagram+options yields the same
// file name whether rendered by the gem or the npm package.
export function digestMaterial(opts) {
  return [
    opts.source,
    opts.format,
    canonicalScale(opts.scale),
    String(opts.theme || 'light').toLowerCase(),
    opts.showIds ? 'true' : 'false',
    opts.showLabels ? 'true' : 'false',
    opts.fontFamily || '',
    opts.version,
  ].join('\n');
}
