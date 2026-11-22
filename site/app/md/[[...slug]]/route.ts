import { markdownFor } from '@/lib/page-markdown';

/* Any docs page or endpoint as plain Markdown: /md/guides/send-a-payout, /md/reference/payouts/create-a-payout. */
export async function GET(req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const p = markdownFor(slug.join('/') || 'index', new URL(req.url).origin);
  if (!p) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(p.markdown + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
