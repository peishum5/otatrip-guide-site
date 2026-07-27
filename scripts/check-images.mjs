#!/usr/bin/env node
/**
 * Verify that every image referenced by a blog post actually exists in public/.
 *
 * Image paths in posts are plain strings (frontmatter `hero_image`, `<ImageCaption src>`),
 * so Astro's image() validation never sees them — a typo or a missing file builds fine
 * and only breaks in production. This check runs before `astro build` to stop that.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const PUBLIC_DIR = join(ROOT, 'public');

/** Recursively collect .mdx/.md files under a directory. */
function collectPosts(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectPosts(full));
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Extract every local image reference from a post, with its line number. */
function extractRefs(source) {
  const refs = [];
  const patterns = [
    // frontmatter: hero_image: "/images/..."
    /^\s*hero_image:\s*["']([^"']+)["']/,
    // component props: src="/images/..." / image="/images/..."
    /\b(?:src|image|poster)=["'](\/[^"']+)["']/g,
    // markdown: ![alt](/images/...)
    /!\[[^\]]*\]\((\/[^)\s]+)/g,
  ];

  source.split('\n').forEach((line, i) => {
    for (const pattern of patterns) {
      if (pattern.global) {
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(line)) !== null) refs.push({ path: m[1], line: i + 1 });
      } else {
        const m = line.match(pattern);
        if (m) refs.push({ path: m[1], line: i + 1 });
      }
    }
  });

  // Remote URLs and data URIs are out of scope — we can only verify local files.
  return refs.filter((r) => r.path.startsWith('/') && !r.path.startsWith('//'));
}

const posts = collectPosts(BLOG_DIR);
const broken = [];
let checked = 0;

for (const post of posts) {
  for (const ref of extractRefs(readFileSync(post, 'utf8'))) {
    checked++;
    if (!existsSync(join(PUBLIC_DIR, ref.path))) {
      broken.push({ post: relative(ROOT, post), ...ref });
    }
  }
}

if (broken.length > 0) {
  console.error(`\n✗ ${broken.length} broken image reference(s) in ${posts.length} posts:\n`);
  for (const b of broken) console.error(`  ${b.post}:${b.line}\n    → ${b.path}`);
  console.error(`\nAdd the missing file(s) under public/ or fix the path, then rebuild.\n`);
  process.exit(1);
}

console.log(`✓ ${checked} image references across ${posts.length} posts all resolve.`);
