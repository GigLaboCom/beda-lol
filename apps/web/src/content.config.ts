import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Six pillar articles, one per letter of ПОБЕДА (`/bukvy/<slug>`). */
const pillars = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pillars' }),
  schema: z.object({
    letter: z.enum(['П', 'О', 'Б', 'Е', 'Д', 'А']),
    slug: z.string().regex(/^[a-z]-[a-z-]+$/),
    title: z.string().max(90),
    description: z.string().min(80).max(220),
    order: z.number().int().min(1).max(6),
    /** Drafts are built but carry noindex and stay out of the sitemap. */
    draft: z.boolean().default(true),
  }),
});

export const collections = { pillars };
