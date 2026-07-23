// Type declarations for render-core.mjs (authored as plain JS so the gem can
// run it directly with Node). Consumed by the TypeScript npm extension.

export const DEFAULT_FONT_FAMILY: string;

export class LdlParseError extends Error {}

/** The loaded @openpowershift/logic-diagram-language module. */
export interface LdlLibrary {
  parse: (source: string) => { diagram: unknown; errors: Array<{ message: string; position?: { line: number; column: number } }> };
  renderDiagram: (diagram: unknown, options: unknown, theme: unknown) => string;
  resolveOptions: (options: unknown) => Record<string, unknown>;
  LIGHT_DIAGRAM: unknown;
  DARK_DIAGRAM: unknown;
}

export interface RenderCoreOpts {
  source: string;
  theme?: string;
  showIds?: boolean;
  showLabels?: boolean;
  fontFamily?: string | null;
  scale?: number | string;
}

export function applyFontFamily(svg: string, family: string | null): string;
export function sizeFromViewBox(svg: string): { width: number; height: number } | null;
export function applySvgScale(svg: string, scale: number): { svg: string; width: number; height: number };
export function renderBaseSvg(lib: LdlLibrary, opts: RenderCoreOpts): string;
export function renderSvg(lib: LdlLibrary, opts: RenderCoreOpts): { svg: string; width: number; height: number };
export function normalizeScale(scale: number | string | null | undefined): number;
export function canonicalScale(scale: number | string): string;
export function normalizeFontFamily(value: string | null | undefined): string | null;
export function digestMaterial(opts: {
  source: string;
  format: string;
  scale: number | string;
  theme?: string;
  showIds?: boolean;
  showLabels?: boolean;
  fontFamily?: string | null;
  version: string;
}): string;
