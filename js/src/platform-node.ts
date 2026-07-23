// Node platform: renders with the shared core + resvg and writes image files,
// reproducing the Ruby extension's output-directory resolution, content-hash
// file names and digest-sidecar caching.

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import {
  renderSvg,
  renderBaseSvg,
  digestMaterial,
} from '../../lib/asciidoctor/ldl/js/render-core.mjs';
import { loadLibrary, rasterisePng } from '../../lib/asciidoctor/ldl/js/node-loader.mjs';

import { sanitizeBasename } from './attributes.js';
import { VERSION } from './version.js';
import type {
  AdocDocument,
  EmitOptions,
  EmitResult,
  OutputFormat,
  Platform,
  RegisterContext,
  RenderRequest,
} from './types.js';

function digest(req: RenderRequest): string {
  const material = digestMaterial({
    source: req.source,
    format: req.format,
    scale: req.scale,
    theme: req.theme,
    showIds: req.showIds,
    showLabels: req.showLabels,
    fontFamily: req.fontFamily,
    version: VERSION,
  });
  return createHash('sha1').update(material).digest('hex').slice(0, 16);
}

function targetFilename(req: RenderRequest, basename: string | null): string {
  if (basename && basename.trim() !== '') {
    return `${sanitizeBasename(basename)}.${req.format}`;
  }
  return `ldl-${digest(req)}.${req.format}`;
}

// Physical directory for the image: imagesoutdir overrides, else imagesdir under
// the output/base directory (matches Asciidoctor's own conventions).
function imageOutputDir(doc: AdocDocument): string {
  const imagesOutdir = doc.getAttribute('imagesoutdir');
  if (imagesOutdir) return String(imagesOutdir);
  const base = String(doc.getAttribute('outdir') || doc.getBaseDir() || process.cwd());
  const imagesdir = doc.getAttribute('imagesdir');
  return imagesdir ? join(base, String(imagesdir)) : base;
}

function cacheValid(path: string, key: string): boolean {
  if (!existsSync(path) || statSync(path).size === 0) return false;
  const cacheFile = `${path}.ldlcache`;
  return existsSync(cacheFile) && readFileSync(cacheFile, 'utf8').trim() === key;
}

function writeCacheKey(path: string, key: string): void {
  try {
    writeFileSync(`${path}.ldlcache`, key);
  } catch {
    /* best-effort */
  }
}

async function loadModule(packageDir: string | null) {
  return loadLibrary(packageDir);
}

export const nodePlatform: Platform = {
  supports(_format: OutputFormat): boolean {
    return true;
  },

  async emit(req: RenderRequest, opts: EmitOptions): Promise<EmitResult> {
    const outDir = imageOutputDir(opts.doc);
    mkdirSync(outDir, { recursive: true });
    const filename = targetFilename(req, opts.basename);
    const path = join(outDir, filename);
    const key = digest(req);

    if (opts.cache && cacheValid(path, key)) return { target: filename };

    const lib = await loadModule(req.packageDir);
    let width = 0;
    let height = 0;

    if (req.format === 'svg') {
      const r = renderSvg(lib, req);
      writeFileSync(path, r.svg, 'utf8');
      width = r.width;
      height = r.height;
    } else {
      const base = renderBaseSvg(lib, req);
      const r = await rasterisePng(base, req.scale, req.packageDir);
      writeFileSync(path, r.data);
      width = r.width;
      height = r.height;
    }

    if (opts.cache) writeCacheKey(path, key);
    return { target: filename, width, height };
  },

  async readSource(doc: AdocDocument, target: string, context: RegisterContext): Promise<string> {
    if (context.vfs?.read) return context.vfs.read(target);
    const docdir = String(doc.getAttribute('docdir') || doc.getBaseDir() || process.cwd());
    const path = isAbsolute(target) ? target : resolve(docdir, target);
    return readFileSync(path, 'utf8');
  },
};
