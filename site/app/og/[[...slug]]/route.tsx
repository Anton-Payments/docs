import { source } from '@/lib/source';
import { routeFor } from '@/lib/guide-route';
import { PRODUCTS } from '@/lib/nav';
import { ogCard, stageRows, type OgRow } from '@/lib/og';

/* The link-preview card for a docs page: /og/guides/send-a-payout is the card for /guides/send-a-payout. */

const pad = (n: number) => String(n).padStart(2, '0');

/** The section a page is filed in, with this page lit: at most seven rows around it. */
function sectionCard(url: string) {
  for (const p of PRODUCTS) {
    for (const s of p.sections) {
      const at = s.items.findIndex((i) => i.href === url);
      if (at < 0) continue;
      const from = Math.max(0, Math.min(at - 3, s.items.length - 7));
      const rows: OgRow[] = s.items.slice(from, from + 7).map((i, n) => ({ label: i.title, n: from + n + 1, state: from + n === at ? 'on' : 'done' }));
      return { big: pad(at + 1), heading: s.title === 'Core path' ? `${p.label} core path` : s.title, rows };
    }
  }
  return {};
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return ogCard({ title: 'Anton Docs' });
  if (page.data.kind === 'home') {
    const payouts = PRODUCTS[0];
    return ogCard({
      title: page.data.title,
      lede: 'Pay out in fiat, stablecoin or crypto, with sanctions screening and risk scoring in the path of every payout.',
      big: pad(payouts.stages.length),
      heading: 'The payout route',
      rows: stageRows(payouts.stages, -1),
    });
  }
  const r = routeFor(page.url);
  if (r) {
    return ogCard({
      title: page.data.title,
      lede: page.data.description,
      big: pad(r.at + 1),
      heading: `${r.route.product} route`,
      rows: stageRows(r.route.stages.map((s) => s.n), r.at),
    });
  }
  return ogCard({ title: page.data.title, lede: page.data.description, ...sectionCard(page.url) });
}
