import { allPages } from '@/lib/page-markdown';
import { loadSpec } from '@/lib/openapi';

/* The llms.txt index: what the docs hold, with a Markdown link for every page and endpoint. */
export const dynamic = 'force-static';

export function GET() {
  const pages = allPages();
  const section = (title: string, prefix: (u: string) => boolean) => {
    const list = pages.filter((p) => prefix(p.url));
    return list.length ? `## ${title}\n\n` + list.map((p) => `- [${p.title}](/md${p.url === '/' ? '/index' : p.url})${p.description ? `: ${p.description}` : ''}`).join('\n') : '';
  };
  const { groups } = loadSpec();
  const body = [
    '# Anton Docs',
    '> Developer docs for Anton Payments: cross-border payouts, and the intelligence layer that screens payees, accounts and payouts. Every page and endpoint below is plain Markdown. The API contract is the OpenAPI file at /openapi-merchant.yaml. An MCP server is at /mcp.',
    section('Get started', (u) => !u.startsWith('/guides') && !u.startsWith('/intelligence') && !u.startsWith('/concepts') && !u.startsWith('/sandbox')),
    section('Payout guides', (u) => u.startsWith('/guides')),
    section('Intelligence', (u) => u.startsWith('/intelligence')),
    section('Concepts', (u) => u.startsWith('/concepts')),
    section('Sandbox', (u) => u.startsWith('/sandbox')),
    '## API reference\n\n' + groups.map((g) => `### ${g.title}\n\n` + g.ops.map((o) => `- [${o.title}](/md${o.href}): \`${o.method.toUpperCase()} ${o.path}\``).join('\n')).join('\n\n'),
  ].filter(Boolean);
  return new Response(body.join('\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
