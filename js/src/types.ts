// Shared types for the extension. Asciidoctor.js objects are loosely typed
// (the JS API is dynamic), so they are represented as `AdocNode`.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AdocNode = any;
export type AdocDocument = any;
export type BlockProcessorDsl = any;

export type OutputFormat = 'svg' | 'png';

/** A fully-resolved render request derived from block/document attributes. */
export interface RenderRequest {
  source: string;
  format: OutputFormat;
  scale: number;
  theme: string;
  showIds: boolean;
  showLabels: boolean;
  fontFamily: string | null;
  packageDir: string | null;
}

export interface EmitOptions {
  doc: AdocDocument;
  basename: string | null;
  cache: boolean;
}

/**
 * How the produced artifact should be referenced by the image block.
 * - `target`: a file was written; use this file name as the image target.
 * - `inline`: inline HTML/SVG to embed (browser, no filesystem).
 */
export interface EmitResult {
  target?: string;
  inline?: string;
  width?: number;
  height?: number;
}

/** A minimal virtual filesystem, mainly for the browser / custom hosts. */
export interface Vfs {
  read: (path: string) => string | Promise<string>;
  exists?: (path: string) => boolean;
  add?: (image: { path: string; contents: Uint8Array | string }) => void;
}

export interface RegisterContext {
  /** Directory to resolve the LDL renderer (and resvg) from (Node). */
  packageDir?: string | null;
  /** Custom filesystem for reading `ldl::` targets and, in the browser, output. */
  vfs?: Vfs;
}

/** Platform-specific rendering + placement (Node writes files; browser inlines). */
export interface Platform {
  emit(req: RenderRequest, opts: EmitOptions): Promise<EmitResult>;
  readSource(doc: AdocDocument, target: string, context: RegisterContext): Promise<string>;
  /** Whether this platform can produce the given format (browser: svg only). */
  supports(format: OutputFormat): boolean;
}
