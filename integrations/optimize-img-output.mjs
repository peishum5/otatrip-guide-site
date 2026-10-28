/**
 * Post-build image pass over the generated HTML.
 *
 * Images live in public/ and are referenced as plain <img src="/images/...">,
 * so Astro's image pipeline never touches them. After the build this:
 *   1. writes a WebP copy next to every local JPG/PNG that an <img> uses
 *      (only when the WebP is actually smaller), and points the <img> at it;
 *   2. adds width/height from the real file so the page does not jump while
 *      photos load. Tailwind's `img { height: auto }` keeps the layout as-is.
 *
 * og:image and other <meta> tags are left alone (social crawlers want JPG).
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WEBP = { quality: 76, effort: 5 };

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

export default function optimizeImgOutput() {
  return {
    name: 'optimize-img-output',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        /** src -> { src, width, height } | null, one sharp run per image. */
        const cache = new Map();

        async function resolve(src) {
          if (cache.has(src)) return cache.get(src);
          let result = null;
          const ext = extname(src).toLowerCase();
          if (src.startsWith('/images/') && ['.jpg', '.jpeg', '.png'].includes(ext)) {
            const file = join(outDir, decodeURI(src));
            try {
              const { width, height } = await sharp(file).metadata();
              const webpSrc = src.slice(0, -ext.length) + '.webp';
              const webpFile = join(outDir, decodeURI(webpSrc));
              const buf = await sharp(file).webp(WEBP).toBuffer();
              const useWebp = buf.length < (await stat(file)).size;
              if (useWebp) await writeFile(webpFile, buf);
              result = { src: useWebp ? webpSrc : src, width, height };
            } catch {
              result = null; // missing/unreadable file: leave the tag untouched
            }
          }
          cache.set(src, result);
          return result;
        }

        let pages = 0;
        for await (const htmlFile of walkHtml(outDir)) {
          const html = await readFile(htmlFile, 'utf8');
          const tags = html.match(/<img\b[^>]*>/g) ?? [];
          let out = html;
          for (const tag of new Set(tags)) {
            const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
            if (!src) continue;
            const info = await resolve(src);
            if (!info) continue;
            let next = tag.replace(`src="${src}"`, `src="${info.src}"`);
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
        const webps = [...cache.values()].filter(v => v?.src.endsWith('.webp')).length;
        logger.info(`${webps} images served as WebP, ${pages} pages updated`);
      },
    },
  };
}
