import { source } from '@/lib/source';
import { loadSpec } from '@/lib/openapi';

type Doc = { title: string; url: string; kind: 'page' | 'heading' | 'endpoint'; snippet?: string; method?: string; hay: string; weight: number };

let index: Doc[] | null = null;
function build(): Doc[] {
  const docs: Doc[] = [];
  for (const p of source.getPages()) {
    const d = p.data;
    docs.push({ title: d.title, url: p.url, kind: 'page', snippet: d.description, hay: `${d.title} ${d.description || ''}`.toLowerCase(), weight: 3 });
    for (const t of d.toc || []) {
      const text = typeof t.title === 'string' ? t.title : '';
      if (text) docs.push({ title: `${d.title} › ${text}`, url: p.url + t.url, kind: 'heading', hay: text.toLowerCase(), weight: 2 });
    }
  }
  for (const o of loadSpec().ops) {
    docs.push({ title: o.title, url: o.href, kind: 'endpoint', method: o.method, snippet: `${o.method.toUpperCase()} ${o.path}`, hay: `${o.title} ${o.path} ${o.summary || ''} ${o.group}`.toLowerCase(), weight: 3 });
  }
  return docs;
}

export function GET(req: Request) {
  index ??= build();
  const q = (new URL(req.url).searchParams.get('q') || '').toLowerCase().trim();
  if (!q) return Response.json([]);
  const terms = q.split(/\s+/);
  const scored = index
    .map((d) => {
      if (!terms.every((t) => d.hay.includes(t))) return null;
      const title = d.title.toLowerCase();
      const score = d.weight + (title.startsWith(q) ? 5 : 0) + (title.includes(q) ? 3 : 0) + (d.kind === 'page' ? 1 : 0);
      return { d, score };
    })
    .filter(Boolean) as { d: Doc; score: number }[];
  scored.sort((a, b) => b.score - a.score);
  return Response.json(scored.slice(0, 12).map(({ d }) => ({ title: d.title, url: d.url, kind: d.kind, snippet: d.snippet, method: d.method })));
}
