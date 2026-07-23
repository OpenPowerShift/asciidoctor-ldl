// Environment-agnostic extension logic: registers the `[ldl]` block and the
// `ldl::` block macro, reads attributes, drives the injected Platform, and emits
// the same image markup and roles as the Ruby extension. All filesystem /
// rendering specifics live behind `Platform`.

import {
  toRenderRequest,
  passthroughImageAttrs,
  imageRoles,
  cacheEnabled,
} from './attributes.js';
import type {
  AdocDocument,
  AdocNode,
  BlockProcessorDsl,
  Platform,
  RegisterContext,
  RenderRequest,
} from './types.js';

function warn(message: string): void {
  // eslint-disable-next-line no-console
  if (typeof console !== 'undefined' && console.warn) console.warn(`asciidoctor-ldl: ${message}`);
}

function errorBlock(processor: BlockProcessorDsl, parent: AdocNode, message: string): AdocNode {
  warn(message);
  return processor.createBlock(parent, 'listing', `LDL diagram error:\n${message}`, {
    role: 'ldl-error',
  });
}

async function buildImage(
  processor: BlockProcessorDsl,
  platform: Platform,
  context: RegisterContext,
  parent: AdocNode,
  doc: AdocDocument,
  source: string,
  attrs: Record<string, unknown>,
  basenameHint: string | null,
): Promise<AdocNode> {
  let req: RenderRequest;
  try {
    req = { ...toRenderRequest(attrs, doc), source };
    // A document attribute wins; otherwise fall back to the programmatic context.
    if (!req.packageDir && context.packageDir) req.packageDir = context.packageDir;
  } catch (e) {
    return errorBlock(processor, parent, (e as Error).message);
  }

  if (!platform.supports(req.format)) {
    return errorBlock(
      processor,
      parent,
      `format '${req.format}' is not supported in this environment (browser supports svg only)`,
    );
  }

  let result;
  try {
    result = await platform.emit(req, { doc, basename: basenameHint, cache: cacheEnabled(doc) });
  } catch (e) {
    return errorBlock(processor, parent, (e as Error).message);
  }

  const role = imageRoles(attrs, req.format, req.theme);

  // Browser: embed the SVG inline via a passthrough block, wrapped so it keeps
  // the same imageblock structure and roles as the file-based path.
  if (result.inline != null) {
    const alt = String(attrs['alt'] ?? attrs['target'] ?? 'LDL logic diagram');
    const html =
      `<div class="imageblock ${role}">\n<div class="content">\n${result.inline}\n</div>\n</div>`;
    void alt;
    return processor.createBlock(parent, 'pass', html);
  }

  const imageAttrs: Record<string, string> = {
    target: result.target as string,
    ...passthroughImageAttrs(attrs),
    role,
  };
  if (imageAttrs['alt'] == null) {
    imageAttrs['alt'] = String(attrs['target'] ?? 'LDL logic diagram');
  }
  return processor.createImageBlock(parent, imageAttrs);
}

/** Build a `register(registry, context)` bound to a specific platform. */
export function createRegister(platform: Platform) {
  return function register(registry: AdocNode, context: RegisterContext = {}): AdocNode {
    // Delimited block:  [ldl] ... ----
    registry.block(function (this: BlockProcessorDsl) {
      const self = this;
      self.named('ldl');
      self.onContexts(['listing', 'literal', 'paragraph', 'open']);
      self.positionalAttributes(['target', 'format']);
      self.process(async function (this: BlockProcessorDsl, parent: AdocNode, reader: AdocNode, attrs: Record<string, unknown>) {
        const doc = parent.getDocument();
        const source = reader.getLines().join('\n');
        const hint = attrs['target'] != null ? String(attrs['target']) : null;
        return buildImage(this, platform, context, parent, doc, source, attrs, hint);
      });
    });

    // Block macro:  ldl::path/to/file.ldl[]
    registry.blockMacro(function (this: BlockProcessorDsl) {
      const self = this;
      self.named('ldl');
      self.positionalAttributes(['format']);
      self.process(async function (this: BlockProcessorDsl, parent: AdocNode, target: string, attrs: Record<string, unknown>) {
        const doc = parent.getDocument();
        let source: string;
        try {
          source = await platform.readSource(doc, target, context);
        } catch (e) {
          return errorBlock(this, parent, `cannot read LDL file: ${target} (${(e as Error).message})`);
        }
        const base = target.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
        const hint = attrs['target'] != null ? String(attrs['target']) : base;
        return buildImage(this, platform, context, parent, doc, source, attrs, hint);
      });
    });

    return registry;
  };
}
