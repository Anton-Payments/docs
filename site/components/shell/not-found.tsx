'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { openSearch } from './search';
import { reportUrl } from '@/lib/site';

/*
  The not-found page. It reads the address that missed, searches the docs for the words in it and
  offers the closest pages, so a stale link from an email or an old bookmark still lands somewhere.
*/

type Hit = { title: string; sub?: string; url: string; group: string };
const STOP = new Set(['api', 'reference', 'guides', 'guide', 'docs', 'v1', 'concepts', 'www', 'html', 'md', 'index', 'the', 'and', 'a', 'an', 'to', 'of']);

const words = (path: string) =>
  path.toLowerCase().split(/[/\-_.#?=&]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 4);

async function find(q: string): Promise<Hit[]> {
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const j = (await r.json()) as { groups: { hits: Hit[] }[] };
    return j.groups.flatMap((g) => g.hits);
  } catch {
    return [];
  }
}

const START = [
  { title: 'Payouts quickstart', sub: 'A sandbox token to a first payout', url: '/quickstart' },
  { title: 'Intelligence quickstart', sub: 'A first evaluation and its decision', url: '/intelligence/quickstart' },
  { title: 'API reference', sub: 'Every endpoint, field and error', url: '/reference' },
];

export function NotFound() {
  const [path, setPath] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);

  useEffect(() => {
    const p = window.location.pathname;
    setPath(p);
    const w = words(p);
    if (!w.length) return setHits([]);
    (async () => {
      // all the words together first; if that finds nothing, each word on its own
      let found = await find(w.join(' '));
      if (!found.length) found = (await Promise.all(w.map(find))).flat();
      const seen = new Set<string>();
      setHits(found.filter((h) => !seen.has(h.url) && seen.add(h.url)).slice(0, 5));
    })();
  }, []);

  return (
    <main className="main nf" id="content">
      <div className="nf-in">
        <div className="nf-k">404 · Not found</div>
        <h1>No page at <code>{path || '…'}</code></h1>

        {hits === null ? (
          <p className="nf-lede">Searching the docs for the words in that address.</p>
        ) : hits.length ? (
          <>
            <p className="nf-lede">The closest pages to the words in that address:</p>
            <ul className="nf-list">
              {hits.map((h) => (
                <li key={h.url}>
                  <Link href={h.url}>
                    <span className="nf-g">{h.group}</span>
                    <b>{h.title}</b>
                    {h.sub && <span className="nf-s">{h.sub}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="nf-lede">Nothing in the docs matches the words in that address. Start from one of these:</p>
        )}

        <div className="nf-row">
          <button type="button" className="btn accent" onClick={openSearch}>Search the docs <kbd>⌘K</kbd></button>
          {path && <a className="btn" href={reportUrl(path, `Broken link to ${path}`)} target="_blank" rel="noreferrer">Report this link ↗</a>}
        </div>

        <div className="nf-start">
          {START.map((s) => (
            <Link key={s.url} href={s.url}>
              <b>{s.title}</b>
              <span>{s.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
