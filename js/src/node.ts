// Node entry point. Full parity with the Ruby extension: SVG + PNG, file output
// with content-hash caching, roles, and identical attribute handling.
//
// Usage (Asciidoctor.js 4):
//
//   import { Extensions, convert } from '@asciidoctor/core';
//   import ldl from '@openpowershift/asciidoctor-ldl';
//   const registry = Extensions.create();
//   ldl.register(registry);
//   const html = await convert(source, { extension_registry: registry, safe: 'safe' });
//
// `convert` returns a Promise because rendering is asynchronous — always await it.

import { createRegister } from './extension-core.js';
import { nodePlatform } from './platform-node.js';
import type { AdocNode, RegisterContext } from './types.js';

export const register = createRegister(nodePlatform);

export type { RegisterContext } from './types.js';

export default { register } as { register: (registry: AdocNode, context?: RegisterContext) => AdocNode };
