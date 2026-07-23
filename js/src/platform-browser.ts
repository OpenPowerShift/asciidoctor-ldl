// Browser platform: renders SVG with the shared core and embeds it inline (no
// filesystem). PNG is unsupported here; use svg (the default). The LDL library
// is supplied by the caller/bundler since it cannot be resolved from disk.

import { renderSvg } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import type { LdlLibrary } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import type {
  AdocDocument,
  EmitOptions,
  EmitResult,
  OutputFormat,
  Platform,
  RegisterContext,
  RenderRequest,
} from './types.js';

export function createBrowserPlatform(lib: LdlLibrary): Platform {
  return {
    supports(format: OutputFormat): boolean {
      return format === 'svg';
    },

    async emit(req: RenderRequest, _opts: EmitOptions): Promise<EmitResult> {
      const { svg, width, height } = renderSvg(lib, req);
      return { inline: svg, width, height };
    },

    async readSource(_doc: AdocDocument, target: string, context: RegisterContext): Promise<string> {
      if (context.vfs?.read) return context.vfs.read(target);
      throw new Error('reading LDL files requires a vfs in the browser');
    },
  };
}
