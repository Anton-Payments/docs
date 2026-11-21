import { createMDX } from 'fumadocs-mdx/next';
import redirects from './lib/redirects.json' with { type: 'json' };

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  devIndicators: false,
  // Every URL the Mintlify site published keeps working.
  async redirects() {
    return redirects.map((r) => ({ ...r, permanent: true }));
  },
  // a preview deployment is never indexed, whatever a crawler makes of robots.txt
  async headers() {
    return process.env.DOCS_PREVIEW === '1' ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : [];
  },
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
  turbopack: { root: new URL('.', import.meta.url).pathname },
};

export default withMDX(config);
