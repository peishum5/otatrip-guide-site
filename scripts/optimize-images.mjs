#!/usr/bin/env node
/**
 * In-place image optimizer for public/images.
 *
 * Downscales each raster image so its longest edge fits a per-folder cap
 * (chosen to match the largest size it is actually displayed at, plus 2x
 * headroom for retina screens) and re-encodes it at a sensible quality.
 * Paths and file extensions are preserved, so no markup changes are needed.
 *
 * Originals are git-tracked, so `git checkout -- public/images` fully reverts.
 *
 * Usage:
 *   node scripts/optimize-images.mjs            # optimize in place
 *   node scripts/optimize-images.mjs --dry-run  # report only, write nothing
 */
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../public/images', import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// Longest-edge caps (px) by path prefix, matched longest-prefix-first.
// Display widths observed in the markup, with ~2x retina headroom.
const CAPS = [
  ['blog/inline', 1280], // inside prose (~720px content column)
  ['why', 1000],         // homepage "why" cards (~370px wide)
  ['guides', 1200],      // guide selection cards
  ['meeting-points', 1400],
  ['blog', 1600],        // article hero / cards (full-bleed up to ~1150px)
  ['tours', 1600],       // tour heroes + galleries (reused full-width)
  ['', 1600],            // default / root (og image etc.)
];

const JPEG = { quality: 80, mozjpeg: true, progressive: true };
const PNG = { compressionLevel: 9, effort: 8 };

function capFor(relPath) {
  const p = relPath.split('\\').join('/');
  for (const [prefix, cap] of CAPS) {
    if (prefix === '' || p.startsWith(prefix + '/')) return cap;
  }
  return 1600;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const fmt = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';

let beforeTotal = 0;
let afterTotal = 0;
let changed = 0;
let skipped = 0;
const rows = [];

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

  const rel = relative(ROOT, file);
  const cap = capFor(rel);
  const beforeSize = (await stat(file)).size;
  beforeTotal += beforeSize;

  try {
    const img = sharp(file, { failOn: 'none' }).rotate(); // bake EXIF orientation
    const meta = await img.metadata();
    const longEdge = Math.max(meta.width || 0, meta.height || 0);

    let pipeline = img;
    if (longEdge > cap) {
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? cap : null,
        height: meta.height > meta.width ? cap : null,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    pipeline = ext === '.png' ? pipeline.png(PNG) : pipeline.jpeg(JPEG);

    const buf = await pipeline.toBuffer();

    // Never make a file bigger; keep the original if re-encode didn't help.
    if (buf.length >= beforeSize) {
      afterTotal += beforeSize;
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      const tmp = file + '.tmp';
      await sharp(buf).toFile(tmp);
      await rename(tmp, file).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e; });
    }

    afterTotal += buf.length;
    changed++;
    rows.push({
      rel,
      dim: `${meta.width}x${meta.height}` + (longEdge > cap ? ` → ${cap}px` : ''),
      before: beforeSize,
      after: buf.length,
    });
  } catch (err) {
    console.error(`! ${rel}: ${err.message}`);
    afterTotal += beforeSize;
    skipped++;
  }
}

rows.sort((a, b) => (b.before - b.after) - (a.before - a.after));
console.log('\nTop reductions:');
for (const r of rows.slice(0, 15)) {
  console.log(`  ${r.rel}  [${r.dim}]  ${fmt(r.before)} → ${fmt(r.after)}`);
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Optimized ${changed} file(s), skipped ${skipped}.`);
console.log(`Total: ${fmt(beforeTotal)} → ${fmt(afterTotal)} ` +
  `(${(100 * (1 - afterTotal / beforeTotal)).toFixed(1)}% smaller)`);
