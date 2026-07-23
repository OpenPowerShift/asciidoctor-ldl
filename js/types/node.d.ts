// Public type surface for the Node entry point. Hand-written and
// self-contained so the published declarations have no external references.

/** A minimal virtual filesystem, e.g. for reading `ldl::` targets. */
export interface Vfs {
  read: (path: string) => string | Promise<string>;
  exists?: (path: string) => boolean;
  add?: (image: { path: string; contents: Uint8Array | string }) => void;
}

export interface RegisterContext {
  /** Directory to resolve the LDL renderer (and resvg) from. */
  packageDir?: string | null;
  /** Custom filesystem for reading `ldl::` targets. */
  vfs?: Vfs;
}

/** An Asciidoctor.js extension registry (from `Extensions.create()`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Registry = any;

/** Register the `[ldl]` block and `ldl::` block macro on a registry. */
export declare const register: (registry: Registry, context?: RegisterContext) => Registry;

declare const _default: { register: typeof register };
export default _default;
