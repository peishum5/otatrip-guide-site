import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Local Guide'),
    pubDate: z.string().optional(),
    last_updated: z.string().optional(),
    updatedAt: z.string().optional(),
    hero_image: z.string().optional(),
    canonical: z.string(),
    category: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    faq: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })).optional(),
    noIndex: z.boolean().optional(),
    // Overrides the generic end-of-article tour CTA so a post can point at the
    // tour it actually relates to. Omit to keep the default /tours CTA.
    cta: z.object({
      eyebrow: z.string().optional(),
      heading: z.string().optional(),
      body: z.string().optional(),
      href: z.string().optional(),
      primaryLabel: z.string().optional(),
      secondaryLabel: z.string().optional(),
      trackPrefix: z.string().optional(),
    }).optional(),
  }),
});

const tours = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    price: z.string().optional(),
    duration: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, tours };
