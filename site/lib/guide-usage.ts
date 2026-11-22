import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { source } from '@/lib/source';

/*
  Which guides walk through an endpoint: every page whose runnable steps call it. The reference
  page links back to them, so a reader who lands on an endpoint can find the job it belongs to.
*/

let index: Map<string, { title: string; url: string }[]> | null = null;

function build() {
  const m = new Map<string, { title: string; url: string }[]>();
  for (const p of source.getPages()) {
    let raw = '';
    try { raw = readFileSync(join(process.cwd(), 'content/docs', p.path), 'utf8'); } catch { continue; }
    const seen = new Set<string>();
    for (const r of raw.matchAll(/<RunStep[^>]*?method="(\w+)"\s+path="([^"]+)"/g)) {
      const k = `${r[1].toUpperCase()} ${r[2]}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const list = m.get(k) || [];
      list.push({ title: p.data.title, url: p.url });
      m.set(k, list);
    }
  }
  return m;
}

export function guidesUsing(method: string, path: string) {
  if (!index || process.env.NODE_ENV !== 'production') index = build();
  return index.get(`${method.toUpperCase()} ${path}`) || [];
}
