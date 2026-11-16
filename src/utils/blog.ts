import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

/**
 * All blog posts in a stable order (by entry id = file path).
 * The content-layer loader (Astro 6+) does not guarantee file order, so we
 * sort here to keep lists with equal dates in the same order as before.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog');
  return posts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function normalizeBlogSlug(slug: string) {
  return slug.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getBlogSortDate(post: BlogPost) {
  const raw = post.data.updatedAt || post.data.last_updated || post.data.pubDate || '1970-01-01';
  return Number.isNaN(Date.parse(raw)) ? 0 : Date.parse(raw);
}

export function getBlogCategory(post: BlogPost) {
  const slug = normalizeBlogSlug(post.id);
  if (post.data.category) return post.data.category;
  if (slug.startsWith('plan/')) return 'Planning Basics';
  if (slug.startsWith('itineraries/')) return 'Itineraries';
  return 'More Guides';
}

export function slugifyCategory(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCategoryHref(category: string) {
  return `/blog/category/${slugifyCategory(category)}`;
}
