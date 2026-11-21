'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/*
  The search palette (⌘K or /). It reads the same index as the MCP server's search_docs, so a field
  name, an error code or a sentence inside a guide all land on the exact section.

  Left: results grouped by kind, each showing why it matched. Right: a preview of the selected
  result, so most lookups end here. Tab cycles the scope; ↑↓ move; Enter opens.
*/

type Preview =
  | { kind: 'text'; body: string }
  | { kind: 'endpoint'; method: string; path: string; summary: string; required: { name: string; type: string }[]; example?: string }
  | { kind: 'error'; status: string; type: string; meaning: string }
  | { kind: 'field'; type: string; description: string; usedIn: { label: string; url: string }[] };
type Hit = { group: Group; title: string; sub: string; url: string; method?: string; status?: string; snippet: string; preview: Preview };
type Group = 'Guides' | 'API reference' | 'Errors' | 'Fields';
type Result = { terms: string[]; groups: { group: Group; total: number; hits: Hit[] }[] };
type Recent = { url: string; title: string };

const SCOPES: (Group | 'All')[] = ['All', 'Guides', 'API reference', 'Errors', 'Fields'];
const JUMPS: Recent[] = [
  { url: '/quickstart', title: 'Send your first payout' },
  { url: '/guides/send-a-payout', title: 'Send a payout' },
  { url: '/reference/payouts/create-payout', title: 'Create a payout' },
  { url: '/guides/verify-webhook-signatures', title: 'Verify webhook signatures' },
  { url: '/errors', title: 'Error handling' },
];
const RECENT_KEY = 'anton-docs-recent';

export function openSearch() {
  window.dispatchEvent(new Event('anton-docs:search'));
}

const readRecent = (): Recent[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as Recent[]; } catch { return []; }
};

/** Wrap every query term in the text in <mark>. */
function Marked({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return <>{text.split(re).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** Inline `code` in plain text. */
const inline = (raw: string, terms: string[]) =>
  raw
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .split(/(`[^`]+`)/).map((p, i) => (p.startsWith('`') && p.endsWith('`') ? <code key={i}><Marked text={p.slice(1, -1)} terms={terms} /></code> : <Marked key={i} text={p.replace(/\*\*/g, '')} terms={terms} />));

function PreviewPane({ hit, terms }: { hit: Hit; terms: string[] }) {
  const p = hit.preview;
  let body: ReactNode;
  if (p.kind === 'endpoint') {
    body = (
      <>
        <div className="pv-ep"><b className={`verb ${p.method}`}>{p.method.toUpperCase()}</b><code>{p.path}</code></div>
        {p.summary && <p>{inline(p.summary, terms)}</p>}
        {p.required.length > 0 && (
          <div className="pv-sec">
            <span className="pv-l">Required</span>
            <ul className="pv-fields">{p.required.map((f) => <li key={f.name}><code><Marked text={f.name} terms={terms} /></code><span>{f.type}</span></li>)}</ul>
          </div>
        )}
        {p.example && <pre className="pv-code">{p.example}</pre>}
      </>
    );
  } else if (p.kind === 'error') {
    body = (
      <>
        <div className="pv-ep"><span className={`sc ${Number(p.status) >= 500 ? 'bad' : p.status === '409' || p.status === '429' ? 'warn' : 'bad'}`}>{p.status}</span><code>{hit.title}</code></div>
        <span className="pv-type">{p.type}</span>
        <p>{inline(p.meaning, terms)}</p>
      </>
    );
  } else if (p.kind === 'field') {
    body = (
      <>
        <div className="pv-ep"><code>{hit.title}</code><span className="pv-type">{p.type}</span></div>
        {p.description && <p>{inline(p.description, terms)}</p>}
        <div className="pv-sec">
          <span className="pv-l">Sent on</span>
          <ul className="pv-links">{p.usedIn.map((u) => <li key={u.url}><a href={u.url}>{u.label}</a></li>)}</ul>
        </div>
      </>
    );
  } else {
    const blocks = p.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).slice(0, 5);
    body = (
      <>
        <div className="pv-page">{hit.url.includes('#') ? hit.sub : 'Page'}</div>
        <h4>{hit.title}</h4>
        {blocks.map((b, i) =>
          /^[-*] /m.test(b) ? (
            <ul key={i}>{b.split('\n').filter((l) => /^\s*[-*] /.test(l)).slice(0, 6).map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*] /, ''), terms)}</li>)}</ul>
          ) : (
            <p key={i}>{inline(b.replace(/\n/g, ' '), terms)}</p>
          ),
        )}
      </>
    );
  }
  return <div className="pv">{body}</div>;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('All');
  const [res, setRes] = useState<Result>({ terms: [], groups: [] });
  const [sel, setSel] = useState(0);
  const [recent, setRecent] = useState<Recent[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const path = usePathname();

  // remember the last pages read, for the empty palette
  useEffect(() => {
    const t = window.setTimeout(() => {
      const title = document.title.replace(/\s*·\s*Anton Docs$/, '');
      if (!title || path === '/') return;
      const next = [{ url: path, title }, ...readRecent().filter((r) => r.url !== path)].slice(0, 5);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage refused */ }
    }, 300);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea,select')) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('anton-docs:search', show);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('anton-docs:search', show); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    if (open) { setRecent(readRecent()); setTimeout(() => input.current?.focus(), 0); }
    else { setQ(''); setScope('All'); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setRes({ terms: [], groups: [] }); setSel(0); return; }
    const c = new AbortController();
    const t = setTimeout(() => {
      const s = scope === 'All' ? '' : `&scope=${encodeURIComponent(scope)}`;
      fetch(`/api/search?q=${encodeURIComponent(q)}${s}`, { signal: c.signal })
        .then((r) => r.json())
        .then((d: Result) => { setRes(d); setSel(0); })
        .catch(() => {});
    }, 90);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, scope]);

  const flat = useMemo(() => res.groups.flatMap((g) => g.hits), [res]);
  const empty = !q.trim();
  const starters = useMemo(() => [...recent, ...JUMPS.filter((j) => !recent.some((r) => r.url === j.url))].slice(0, 9), [recent]);
  const count = empty ? starters.length : flat.length;

  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;
  const go = (url: string) => { setOpen(false); router.push(url); };
  const cycle = (d: number) => setScope((s) => SCOPES[(SCOPES.indexOf(s) + d + SCOPES.length) % SCOPES.length]);
  const cur = flat[sel];
  let n = -1;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="pal" role="dialog" aria-label="Search the docs">
        <div className="pal-in">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guides, endpoints, error codes and fields"
            aria-label="Search"
            aria-controls="pal-list"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, count - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === 'Tab') { e.preventDefault(); cycle(e.shiftKey ? -1 : 1); }
              else if (e.key === 'Enter') {
                const url = empty ? starters[sel]?.url : flat[sel]?.url;
                if (url) go(url);
              }
            }}
          />
          <kbd>esc</kbd>
        </div>
        {!empty && (
          <div className="pal-scope">
            <div className="seg2" role="group" aria-label="Search in">
              {SCOPES.map((s) => <button key={s} type="button" aria-pressed={scope === s} onClick={() => { setScope(s); input.current?.focus(); }}>{s}</button>)}
            </div>
          </div>
        )}
        <div className={`pal-body ${empty ? 'start' : ''}`}>
          <div className="pal-list" id="pal-list" role="listbox" ref={list}>
            {empty ? (
              <>
                {starters.map((r, i) => (
                  <Fragment key={r.url}>
                  {(i === 0 || i === recent.length) && <div className="pal-g">{i < recent.length ? 'Recent' : 'Start here'}</div>}
                  <a href={r.url} className="pal-row" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={(e) => { e.preventDefault(); go(r.url); }}>
                    <span className="pr-t">{r.title}</span>
                    <span className="pr-s">{r.url}</span>
                  </a>
                  </Fragment>
                ))}
              </>
            ) : flat.length === 0 ? (
              <div className="pal-none">Nothing in {scope === 'All' ? 'the docs' : scope} matches “{q}”.</div>
            ) : (
              res.groups.map((g) => (
                <div key={g.group}>
                  <div className="pal-g">{g.group}<span>{g.total}</span></div>
                  {g.hits.map((h) => {
                    n++;
                    const i = n;
                    return (
                      <a key={h.url + h.title} href={h.url} className="pal-row" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={(e) => { e.preventDefault(); go(h.url); }}>
                        <span className="pr-t">
                          {h.group === 'API reference' && h.method && <><b className={`verb ${h.method}`}>{h.method.toUpperCase()}</b><code><Marked text={h.sub} terms={res.terms} /></code></>}
                          {h.group === 'Errors' && <><span className="pr-st">{h.status}</span><code><Marked text={h.title} terms={res.terms} /></code></>}
                          {h.group === 'Fields' && <><code><Marked text={h.title} terms={res.terms} /></code><span className="pr-ty">{h.sub}</span></>}
                          {h.group === 'Guides' && (h.url.includes('#') ? <><span className="pr-pg">{h.sub}</span><span className="pr-sep">›</span><span><Marked text={h.title} terms={res.terms} /></span></> : <span><Marked text={h.title} terms={res.terms} /></span>)}
                        </span>
                        <span className="pr-s">{h.group === 'API reference' ? h.title : inline(h.snippet, res.terms)}</span>
                      </a>
                    );
                  })}
                  {scope === 'All' && g.total > g.hits.length && (
                    <button type="button" className="pal-more" onClick={() => { setScope(g.group); input.current?.focus(); }}>All {g.total} in {g.group}</button>
                  )}
                </div>
              ))
            )}
          </div>
          {!empty && cur && <aside className="pal-prev" aria-label="Preview"><PreviewPane hit={cur} terms={res.terms} /></aside>}
        </div>
        <div className="pal-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          {!empty && <span><kbd>tab</kbd> scope</span>}
          <span className="pal-foot-r">Also in your AI tool, via <a href="/mcp" onClick={(e) => { e.preventDefault(); go('/mcp'); }}>MCP</a></span>
        </div>
      </div>
    </div>
  );
}
