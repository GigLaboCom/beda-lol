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

/**
 * Site rules and privacy policy (`/pravila`, `/konfidencialnost`), one file per locale:
 * `legal/<lang>/<page>.md`. Square brackets mark what the author fills in before publishing.
 */
const legal = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/legal' }),
  schema: z.object({
    page: z.enum(['pravila', 'konfidencialnost']),
    title: z.string().max(90),
    description: z.string().min(60).max(220),
    /** Date of the last change of substance, shown on the page. */
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Drafts carry noindex, a draft notice, and stay out of the sitemap. */
    draft: z.boolean().default(true),
  }),
});

export const collections = { pillars, legal };
