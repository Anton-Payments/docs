import { search, snippet, terms, type Group } from '@/lib/search-index';

/*
  The palette's search: grouped results (Guides, API reference, Errors, Fields), each with one
  line showing the match and a preview. Groups come in order of their best hit.
*/

const GROUPS: Group[] = ['Guides', 'API reference', 'Errors', 'Fields'];

export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get('q') || '').trim();
  const s = params.get('scope');
  const scope = GROUPS.find((g) => g === s);
  if (!q) return Response.json({ terms: [], groups: [] });
  const hits = search(q, scope);
  const per = scope ? 40 : 5;
  const groups = GROUPS.map((group) => {
    const all = hits.filter((h) => h.group === group);
    return {
      group,
      total: all.length,
      best: all[0]?.score ?? -1,
      hits: all.slice(0, per).map(({ score: _s, text, ...h }) => { void _s; return { ...h, snippet: snippet(text, q) }; }),
    };
  })
    .filter((g) => g.total > 0)
    .sort((a, b) => b.best - a.best)
    .map(({ best: _b, ...g }) => { void _b; return g; });
  return Response.json({ terms: terms(q), groups });
}
