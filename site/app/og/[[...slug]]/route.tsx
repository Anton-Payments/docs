import { source } from '@/lib/source';
import { routeFor } from '@/lib/guide-route';
import { sectionOf } from '@/lib/nav';
import { ogCard } from '@/lib/og';

/* The link-preview card for a docs page: /og/guides/send-a-payout is the card for /guides/send-a-payout. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return ogCard({ eyebrow: 'Docs', title: 'Anton Docs' });
  if (page.data.kind === 'home') {
    return ogCard({ eyebrow: 'Payouts and Intelligence', title: page.data.title, lede: 'Pay out in fiat, stablecoin or crypto, with sanctions screening and risk scoring in the path of every payout.' });
  }
  const r = routeFor(page.url);
  return ogCard({
    eyebrow: r ? `${r.route.product} · ${r.route.stages[r.at].n}` : sectionOf(page.url) || page.data.section || 'Docs',
    title: page.data.title,
    lede: page.data.description,
    route: r ? { stages: r.route.stages.map((s) => s.n), at: r.at } : undefined,
  });
}
