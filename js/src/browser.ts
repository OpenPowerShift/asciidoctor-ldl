// Browser entry point. SVG only, embedded inline. The LDL renderer is imported
// statically so the consumer's bundler (or an import map) provides it.
//
//   import { Extensions, convert } from '@asciidoctor/core';
//   import ldl from '@openpowershift/asciidoctor-ldl/browser';
//   const registry = Extensions.create();
//   ldl.register(registry);
//   const html = await convert(source, { extension_registry: registry });

import * as ldlLibrary from '@openpowershift/logic-diagram-language';
import { createRegister } from './extension-core.js';
import { createBrowserPlatform } from './platform-browser.js';
import type { LdlLibrary } from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import type { AdocNode, RegisterContext } from './types.js';

export const register = createRegister(
  createBrowserPlatform(ldlLibrary as unknown as LdlLibrary),
);

export type { RegisterContext } from './types.js';

export default { register } as { register: (registry: AdocNode, context?: RegisterContext) => AdocNode };
