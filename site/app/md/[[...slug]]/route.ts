import { pageMarkdown } from '@/lib/page-markdown';

/* Any docs page as plain Markdown: /md/guides/send-a-payout. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const path = slug.join('/').replace(/\.md$/, '');
  const p = pageMarkdown(path === 'index' ? '/' : path);
  if (!p) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(p.markdown + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
