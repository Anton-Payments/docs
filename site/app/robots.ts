import type { MetadataRoute } from 'next';

/* A preview deployment (DOCS_PREVIEW=1) asks every crawler to stay out; the real site welcomes them. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.DOCS_PREVIEW === '1') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' } };
}
