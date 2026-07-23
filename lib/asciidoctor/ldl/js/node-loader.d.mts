// Type declarations for node-loader.mjs (Node-only concerns).
import type { LdlLibrary } from './render-core.mjs';

export function loadLibrary(packageDir?: string | null): Promise<LdlLibrary>;
export function loadResvg(packageDir?: string | null): Promise<{ Resvg: new (svg: string, opts: unknown) => { render: () => { asPng: () => Uint8Array; width: number; height: number } } }>;
export function rasterisePng(
  baseSvg: string,
  scale: number,
  packageDir?: string | null,
): Promise<{ data: Uint8Array; width: number; height: number }>;
