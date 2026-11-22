import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { loadSpec } from '@/lib/openapi';
import { SITE_URL } from '@/lib/site';

/* Every page and every endpoint. A preview build serves it too; its robots.txt keeps crawlers out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((p) => ({ url: SITE_URL + p.url }));
  const ops = loadSpec().ops.map((o) => ({ url: SITE_URL + o.href }));
  return [...pages, { url: `${SITE_URL}/reference` }, ...ops];
}
