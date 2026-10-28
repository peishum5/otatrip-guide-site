#!/usr/bin/env node
/**
 * Post-build image pass over the generated HTML. Runs after `astro build`
 * as its own process (inside an Astro hook it stalled on Linux builders).
 *
 * Images live in public/ and are referenced as plain <img src="/images/...">,
 * so Astro's image pipeline never touches them. This:
 *   1. writes a WebP copy next to every local JPG/PNG that an <img> uses
 *      (only when the WebP is actually smaller), and points the <img> at it;
 *   2. adds width/height from the real file so the page does not jump while
 *      photos load. Tailwind's `img { height: auto }` keeps the layout as-is.
 *
 * og:image and other <meta> tags are left alone (social crawlers want JPG).
 * Each WebP is written before any HTML points at it, so stopping midway
 * still leaves a working site.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The Vercel adapter deploys .vercel/output/static; dist is what CI/local preview use.
// With an on-demand route (e.g. /api/quest/judge) Astro writes the static site to dist/client.
const DIST = existsSync(join(ROOT, 'dist/client')) ? 'dist/client' : 'dist';
const OUT_DIRS = ['.vercel/output/static', DIST].map(d => join(ROOT, d)).filter(existsSync);
const WEBP = { quality: 76, effort: 4 };
const TIME_LIMIT_MS = 5 * 60 * 1000;

sharp.concurrency(1);
setTimeout(() => {
  console.warn('[optimize-built-images] time limit reached, leaving the rest as JPG/PNG');
  process.exit(0);
}, TIME_LIMIT_MS).unref();

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

/** src -> { webp: Buffer | null, width, height } | null, one encode per image. */
const encoded = new Map();

async function encode(outDir, src) {
  if (encoded.has(src)) return encoded.get(src);
  let result = null;
  const ext = extname(src).toLowerCase();
  if (src.startsWith('/images/') && ['.jpg', '.jpeg', '.png'].includes(ext)) {
    const file = join(outDir, decodeURI(src));
    try {
      const { width, height } = await sharp(file).metadata();
      const buf = await sharp(file).webp(WEBP).toBuffer();
      result = { webp: buf.length < (await stat(file)).size ? buf : null, width, height };
    } catch {
      result = null; // missing/unreadable file: leave the tag untouched
    }
  }
  encoded.set(src, result);
  return result;
}

for (const outDir of OUT_DIRS) {
  const written = new Set();
  let pages = 0;
  for await (const htmlFile of walkHtml(outDir)) {
    const html = await readFile(htmlFile, 'utf8');
    let out = html;
    for (const tag of new Set(html.match(/<img\b[^>]*>/g) ?? [])) {
      const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
      if (!src) continue;
      const info = await encode(outDir, src);
      if (!info) continue;
      let next = tag;
      if (info.webp) {
        const webpSrc = src.slice(0, -extname(src).length) + '.webp';
        if (!written.has(webpSrc)) {
          await writeFile(join(outDir, decodeURI(webpSrc)), info.webp);
          written.add(webpSrc);
        }
        next = next.replace(`src="${src}"`, `src="${webpSrc}"`);
      }
      if (!/\swidth=/.test(next) && !/\sheight=/.test(next)) {
        next = next.replace(/^<img/, `<img width="${info.width}" height="${info.height}"`);
      }
      if (next !== tag) out = out.split(tag).join(next);
    }
    if (out !== html) {
      await writeFile(htmlFile, out);
      pages++;
    }
  }
  console.log(`[optimize-built-images] ${outDir.slice(ROOT.length + 1)}: ${written.size} images as WebP, ${pages} pages updated`);
}
