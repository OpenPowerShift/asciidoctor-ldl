// Standalone, zero-dependency build for drop-in use (e.g. Asciidoctor VS Code)
// where the user cannot install npm packages. Everything — the extension and
// the LDL renderer — is bundled into a single CommonJS file. Because the
// renderer is inlined it is available synchronously, so the processors are
// synchronous too and work even with Asciidoctor.js builds that do not await
// async extensions. SVG only (PNG needs a native rasteriser); diagrams are
// embedded inline, which is what a preview/webview wants.

import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import * as ldlLibrary from '@openpowershift/logic-diagram-language';

import { renderSvg } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import type { LdlLibrary } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import { toRenderRequest, imageRoles } from './attributes.js';
import type { AdocNode } from './types.js';

const lib = ldlLibrary as unknown as LdlLibrary;

/* eslint-disable @typescript-eslint/no-explicit-any */

function warn(message: string): void {
  if (typeof console !== 'undefined' && console.warn) console.warn(`asciidoctor-ldl: ${message}`);
}

function errorBlock(processor: any, parent: AdocNode, message: string): AdocNode {
  warn(message);
  return processor.createBlock(parent, 'listing', `LDL diagram error:\n${message}`, {
    role: 'ldl-error',
  });
}

function inlineImage(
  processor: any,
  parent: AdocNode,
  source: string,
  attrs: Record<string, unknown>,
): AdocNode {
  const req = toRenderRequest(attrs, parent.getDocument());
  if (req.format !== 'svg') {
    return errorBlock(processor, parent, "the standalone build renders SVG only (use format=svg)");
  }
  const { svg } = renderSvg(lib, { ...req, source });
  const role = imageRoles(attrs, 'svg', req.theme);
  const html = `<div class="imageblock ${role}">\n<div class="content">\n${svg}\n</div>\n</div>`;
  return processor.createBlock(parent, 'pass', html);
}

/** Register the `[ldl]` block and `ldl::` macro (synchronous, inline SVG). */
export function register(registry: any): any {
  registry.block(function (this: any) {
    this.named('ldl');
    this.onContexts(['listing', 'literal', 'paragraph', 'open']);
    this.positionalAttributes(['target', 'format']);
    this.process(function (this: any, parent: AdocNode, reader: any, attrs: Record<string, unknown>) {
      try {
        return inlineImage(this, parent, reader.getLines().join('\n'), attrs);
      } catch (e) {
        return errorBlock(this, parent, (e as Error).message);
      }
    });
  });

  registry.blockMacro(function (this: any) {
    this.named('ldl');
    this.positionalAttributes(['format']);
    this.process(function (this: any, parent: AdocNode, target: string, attrs: Record<string, unknown>) {
      try {
        const doc = parent.getDocument();
        const docdir = String(doc.getAttribute('docdir') || doc.getBaseDir() || '.');
        const path = isAbsolute(target) ? target : resolve(docdir, target);
        return inlineImage(this, parent, readFileSync(path, 'utf8'), attrs);
      } catch (e) {
        return errorBlock(this, parent, `cannot render ${target}: ${(e as Error).message}`);
      }
    });
  });

  return registry;
}

// Exported so asciidoctor-vscode (which calls the module or its .register) and
// programmatic users both work. The CJS footer (see build.mjs) additionally
// makes `module.exports` itself the callable register function.
(register as any).register = register;
export default register;
