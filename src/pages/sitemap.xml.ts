import { getCollection } from 'astro:content';
import { getBlogCategory, getCategoryHref } from '../utils/blog';

const STATIC_ROUTES = [
  '/',
  '/tours',
  '/tours/gion-sake-walk',
  '/tours/izakaya-hopping',
  '/tours/shimogamo-manga-walk',
  '/blog',
  '/guide',
  '/groups',
  '/contact',
  '/game',
];

export async function GET({ site }: { site: URL | undefined }) {
  const siteUrl = site?.origin || 'https://otatrip.guide';
  const posts = await getCollection('blog');
  const categoryRoutes = [...new Set(posts.filter((post) => !post.data.noIndex).map((post) => getCategoryHref(getBlogCategory(post))))];

  const urls = [
    ...STATIC_ROUTES.map((path) => ({ loc: `${siteUrl}${path}` })),
    ...categoryRoutes.map((path) => ({ loc: `${siteUrl}${path}` })),
    ...posts
      .filter((post) => !post.data.noIndex)
      .map((post) => ({
        loc: new URL(post.data.canonical.replace(/\/{2,}/g, '/'), siteUrl).toString(),
        lastmod: post.data.updatedAt || post.data.last_updated || post.data.pubDate,
      })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod }) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
