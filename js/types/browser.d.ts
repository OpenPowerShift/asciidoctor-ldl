// Public type surface for the browser entry point (SVG only, inline output).
export type { RegisterContext, Vfs, Registry } from './node.js';
import type { Registry, RegisterContext } from './node.js';

export declare const register: (registry: Registry, context?: RegisterContext) => Registry;

declare const _default: { register: typeof register };
export default _default;
