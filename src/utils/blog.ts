import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export function normalizeBlogSlug(slug: string) {
  return slug.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getBlogSortDate(post: BlogPost) {
  const raw = post.data.updatedAt || post.data.last_updated || post.data.pubDate || '1970-01-01';
  return Number.isNaN(Date.parse(raw)) ? 0 : Date.parse(raw);
}

export function getBlogCategory(post: BlogPost) {
  const slug = normalizeBlogSlug(post.slug);
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
