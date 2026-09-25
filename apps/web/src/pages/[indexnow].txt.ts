import type { APIRoute } from 'astro';

/**
 * IndexNow key file (`/<key>.txt`, body = key). The key comes from
 * BEDA_INDEXNOW_KEY at runtime; without it every such path is a 404.
 * Used from stage 3, when UGC pages ping IndexNow.
 */
export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const key = process.env.BEDA_INDEXNOW_KEY ?? '';
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key) || params.indexnow !== key) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(key, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
