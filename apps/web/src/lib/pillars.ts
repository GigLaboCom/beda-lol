import { type CollectionEntry, getCollection } from 'astro:content';

export type PillarEntry = CollectionEntry<'pillars'>;

/** All six articles in word order. */
export async function pillarsInOrder(): Promise<PillarEntry[]> {
  const all = await getCollection('pillars');
  return all.sort((a, b) => a.data.order - b.data.order);
}

export const pillarPath = (slug: string) => `/bukvy/${slug}`;
