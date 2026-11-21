import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flatten, loadSpec, requestExample, type Schema } from '@/lib/openapi';
import { allPages } from '@/lib/page-markdown';

/*
  The one search index. The search palette (/api/search) and the MCP server's search_docs read
  it, so a reader and an AI tool find the same things. Four kinds of entry:

    guide     a section of any page, landing on its heading
    endpoint  an API operation, with its required fields and an example request
    error     a code from the errors catalog, with its status and meaning
    field     a request-body field, with its type, rules and the endpoints that take it

  Every entry carries a preview, so most lookups end in the palette without opening a page.
*/

export type Group = 'Guides' | 'API reference' | 'Errors' | 'Fields';

export type Preview =
  | { kind: 'text'; body: string }
  | { kind: 'endpoint'; method: string; path: string; summary: string; required: { name: string; type: string }[]; example?: string }
  | { kind: 'error'; status: string; type: string; meaning: string }
  | { kind: 'field'; type: string; description: string; usedIn: { label: string; url: string }[] };

export type Entry = {
  group: Group;
  title: string;
  /** a second line: a guide's page, an endpoint's path, an error's status */
  sub: string;
  url: string;
  method?: string;
  status?: string;
  /** what the query is matched against, lowercased */
  hay: string;
  /** the exact token for exact-match boosting: a code or a field name */
  key?: string;
  /** a plain sentence to show the match in */
  text: string;
  preview: Preview;
};

const plain = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*>#|]/g, ' ') // not _: field names and codes keep their underscores
    .replace(/\s+/g, ' ')
    .trim();
const slug = (h: string) => h.toLowerCase().replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const typeOf = (s: Schema | undefined): string => {
  const f = flatten(s);
  if (!f) return 'any';
  const t = Array.isArray(f.type) ? f.type.filter((x) => x !== 'null').join(' | ') : f.type || (f.properties ? 'object' : 'any');
  return t === 'array' ? `array of ${typeOf(f.items)}` : t;
};

function guides(): Entry[] {
  const out: Entry[] = [];
  for (const p of allPages()) {
    for (const sec of p.markdown.split(/\n(?=## )/)) {
      const isHead = sec.startsWith('## ');
      const heading = isHead ? sec.slice(3, sec.indexOf('\n') > 0 ? sec.indexOf('\n') : undefined).replace(/`/g, '').trim() : '';
      const body = isHead ? sec.slice(sec.indexOf('\n') + 1) : sec.replace(/^# .*\n/, '');
      const text = plain(body);
      if (!text) continue;
      out.push({
        group: 'Guides',
        title: heading || p.title,
        sub: heading ? p.title : p.description,
        url: p.url + (heading ? `#${slug(heading)}` : ''),
        hay: `${p.title} ${heading} ${text}`.toLowerCase(),
        text,
        preview: { kind: 'text', body: body.replace(/```[\s\S]*?```/g, '').trim().slice(0, 900) },
      });
    }
  }
  return out;
}

function endpoints(): Entry[] {
  return loadSpec().ops.map((o) => {
    const body = flatten(o.requestBody?.content?.['application/json']?.schema);
    const req = new Set(body?.required || []);
    const required = Object.entries(body?.properties || {})
      .filter(([k, v]) => req.has(k) && !flatten(v)?.readOnly)
      .map(([name, v]) => ({ name, type: typeOf(v) }));
    const ex = requestExample(o);
    const summary = plain(o.description || o.summary || '').split(/(?<=\.)\s/)[0] || '';
    return {
      group: 'API reference' as Group,
      title: o.title,
      sub: o.path,
      url: o.href,
      method: o.method,
      hay: `${o.title} ${o.method} ${o.path} ${o.group} ${o.summary || ''} ${plain(o.description || '')}`.toLowerCase(),
      text: summary,
      preview: {
        kind: 'endpoint' as const,
        method: o.method,
        path: o.path,
        summary,
        required,
        example: ex === undefined ? undefined : JSON.stringify(ex, null, 2).split('\n').slice(0, 16).join('\n'),
      },
    };
  });
}

function errors(): Entry[] {
  let raw = '';
  try { raw = readFileSync(join(process.cwd(), 'content/docs/errors.mdx'), 'utf8'); } catch { return []; }
  const at = raw.indexOf('## Error codes');
  const out: Entry[] = [];
  for (const m of raw.slice(at).matchAll(/^\| `([a-z0-9_.]+)` \| (\d{3}) \| `([a-z_]+)` \| (.+?) \|\s*$/gm)) {
    const [, code, status, type, meaning] = m;
    const text = plain(meaning);
    out.push({
      group: 'Errors',
      title: code,
      sub: status,
      url: `/errors#${code}`,
      status,
      key: code,
      hay: `${code} ${status} ${type} ${text}`.toLowerCase(),
      text,
      preview: { kind: 'error', status, type, meaning: text },
    });
  }
  return out;
}

function fields(): Entry[] {
  const by = new Map<string, { type: string; description: string; usedIn: { label: string; url: string }[] }>();
  for (const o of loadSpec().ops) {
    const body = flatten(o.requestBody?.content?.['application/json']?.schema);
    for (const [name, v] of Object.entries(body?.properties || {})) {
      const f = flatten(v);
      if (!f || f.readOnly) continue;
      const e = by.get(name) || { type: typeOf(f), description: plain(f.description || ''), usedIn: [] };
      if (!e.description && f.description) e.description = plain(f.description);
      e.usedIn.push({ label: `${o.method.toUpperCase()} ${o.path}`, url: o.href });
      by.set(name, e);
    }
  }
  return [...by].map(([name, e]) => ({
    group: 'Fields' as Group,
    title: name,
    sub: e.type,
    url: e.usedIn[0].url,
    key: name,
    hay: `${name} ${e.description}`.toLowerCase(),
    text: e.description,
    preview: { kind: 'field' as const, type: e.type, description: e.description, usedIn: e.usedIn.slice(0, 6) },
  }));
}

let cache: Entry[] | null = null;
export function index(): Entry[] {
  if (!cache || process.env.NODE_ENV !== 'production') cache = [...guides(), ...endpoints(), ...errors(), ...fields()];
  return cache;
}

export const terms = (q: string) => q.toLowerCase().split(/\s+/).map((t) => t.replace(/^[`"']+|[`"',.]+$/g, '')).filter((t) => t.length > 1);

export type Hit = Omit<Entry, 'hay'> & { score: number };

/** Every entry that holds all the terms, best first: an exact code or field name, then title matches, then body. */
export function search(q: string, scope?: Group): Hit[] {
  const ts = terms(q);
  if (!ts.length) return [];
  const whole = q.trim().toLowerCase();
  const hits: Hit[] = [];
  for (const e of index()) {
    if (scope && e.group !== scope) continue;
    if (!ts.every((t) => e.hay.includes(t))) continue;
    const title = e.title.toLowerCase();
    let score = ts.reduce((a, t) => a + Math.min(5, e.hay.split(t).length - 1), 0);
    if (e.key && e.key === whole) score += 60;
    if (title === whole) score += 40;
    else if (title.startsWith(whole)) score += 20;
    score += ts.filter((t) => title.includes(t)).length * 8;
    // every word of the query in the title: this is very likely the thing asked for
    if (ts.length > 1 && ts.every((t) => title.includes(t))) score += 25;
    // a whole page outranks a same-named section inside another page
    if (e.group === 'Guides' && !e.url.includes('#')) score += 12;
    const { hay: _hay, ...rest } = e;
    void _hay;
    hits.push({ ...rest, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** One line of the entry's text around the first match. */
export function snippet(text: string, q: string, width = 150): string {
  const ts = terms(q);
  const low = text.toLowerCase();
  const at = ts.map((t) => low.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - Math.floor(width / 3));
  const s = text.slice(start, start + width).trim();
  return (start > 0 ? '…' : '') + s + (start + width < text.length ? '…' : '');
}
