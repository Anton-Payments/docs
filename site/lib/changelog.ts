import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LatestEntry = { date: string; title: string; summary: string; href: string };

const clean = (s: string) =>
  s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^[-*]\s+/, '').trim();

const firstSentence = (s: string) => {
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : s;
};

/** The newest changelog entries, read from the changelog page so the home page never drifts from it. */
export function latestEntries(n = 3): LatestEntry[] {
  const src = readFileSync(join(process.cwd(), 'content/docs/changelog.mdx'), 'utf8');
  const out: LatestEntry[] = [];
  const re = /<Entry\s+date="([^"]+)"\s+title="([^"]+)"([^>]*)>([\s\S]*?)<\/Entry>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) && out.length < n) {
    const [, date, title, attrs, body] = m;
    const lede = attrs.match(/lede="([^"]+)"/)?.[1];
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const para = lines.find((l) => !/^(#|<|\||```)/.test(l));
    const summary = lede ? firstSentence(lede) : para ? firstSentence(clean(para)) : '';
    const id = `${date}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    out.push({ date, title, summary, href: `/changelog#${id}` });
  }
  return out;
}

export function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
