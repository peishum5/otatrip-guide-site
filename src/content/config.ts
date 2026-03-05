import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Local Guide'),
    pubDate: z.string().optional(),
    last_updated: z.string().optional(),
    hero_image: z.string().optional(),
    canonical: z.string().optional(),
    category: z.string().optional(),
    slug: z.string().optional(),
    noIndex: z.boolean().optional(),
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
