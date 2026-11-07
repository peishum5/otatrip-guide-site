import { getCollection } from 'astro:content';
import { TOURS } from '../data/tours';
import { CONTACT_EMAIL, OPERATOR_URL, TRIPADVISOR_URL } from '../config/site';
import { getBlogCategory, getBlogSortDate } from '../utils/blog';

/**
 * /llms.txt — a plain-text summary of the site for AI assistants
 * (ChatGPT, Claude, Perplexity, Gemini ...). Format: https://llmstxt.org
 *
 * Tour facts come from src/data/tours.ts and the guide list from the blog
 * collection, so this file updates itself on every build.
 */
export async function GET({ site }: { site: URL | undefined }) {
  const siteUrl = site?.origin || 'https://otatrip.guide';
  const abs = (path: string) => new URL(path, siteUrl).toString();

  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.noIndex)
    .sort((a, b) => getBlogSortDate(b) - getBlogSortDate(a));

  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const category = getBlogCategory(post);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(post);
  }

  const tourBlocks = TOURS.map((tour) => {
    const rating = tour.rating && tour.reviews ? ` Rated ${tour.rating}/5 (${tour.reviews} reviews).` : '';
    return [
      `### ${tour.name}`,
      '',
      `${tour.description}${rating}`,
      '',
      ...tour.facts.map((fact) => `- ${fact}`),
      `- Book online: ${abs(tour.href)}#booking`,
      '',
    ].join('\n');
  }).join('\n');

  const guideBlocks = [...byCategory.entries()].map(([category, list]) => [
    `### ${category}`,
    '',
    ...list.map((post) => `- [${post.data.title}](${abs(post.data.canonical)}): ${post.data.description}`),
    '',
  ].join('\n')).join('\n');

  const body = `# OTAtrip Guide

> OTAtrip Guide is a small, Kyoto-based tour company running English-language walking tours and hands-on workshops in Kyoto, Japan: a Gion night walk through the geisha district, izakaya hopping in Pontocho, a Shimogamo Shrine walk with a custom manga souvenir, a Japanese pour-over coffee workshop near Nishiki Market, and a matcha tea ceremony with an Urasenke teacher. Rated 4.9/5 on TripAdvisor. Operated by 8E6 Inc. (8E6株式会社), Kyoto.

## Key facts

- Based in Kyoto, Japan. All tours and workshops are in Kyoto and conducted in English.
- Small groups (max 4 to 10 guests depending on the tour). Private tours and groups of up to 40 guests are available on request.
- Led by local guides who live in Kyoto. Founder: Shumpei (名越俊平), a Kyoto resident of 13 years, Ph.D. in astrophysics and professional magician.
- Prices are in Japanese yen (JPY) and shown on each tour page. Booking is online on each tour page of this website.
- Reviews: 4.9/5 on TripAdvisor (${TRIPADVISOR_URL}).
- Good fit for: first-time visitors to Kyoto, solo travelers, couples, families, people who want to see Gion and geisha culture with a local, and travelers looking for small-group or hands-on cultural experiences.
- Contact: ${CONTACT_EMAIL}. Instagram and X (Twitter): @Otatrip_guide.
- Operator: 8E6 Inc. (${OPERATOR_URL}).

## Tours and workshops

All tours: ${abs('/tours')}

${tourBlocks}
## Groups and private tours

- [Groups and private tours](${abs('/groups')}): private walking tours in Gion, Higashiyama and Kiyomizu for groups of any size (up to 40 guests), morning, afternoon or night.
- [Contact](${abs('/contact')}): questions and custom requests.
- [Our guides](${abs('/guide')}): who leads the tours.

## Kyoto travel guides

Free, practical guides written by local guides in Kyoto. Index: ${abs('/blog')}

${guideBlocks}`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
