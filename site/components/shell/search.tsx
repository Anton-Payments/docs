'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Hit = { title: string; url: string; kind: 'page' | 'heading' | 'text' | 'endpoint'; snippet?: string; method?: string };

export function openSearch() {
  window.dispatchEvent(new Event('anton-docs:search'));
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea,select')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('anton-docs:search', show);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('anton-docs:search', show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else setQ('');
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return setHits([]);
    const c = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: c.signal })
        .then((r) => r.json())
        .then((d: Hit[]) => {
          setHits(d);
          setSel(0);
        })
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q]);

  if (!open) return null;
  const go = (h: Hit) => {
    setOpen(false);
    router.push(h.url);
  };
  const isRequestId = /^req_/i.test(q.trim());
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="searchbox" role="dialog" aria-label="Search">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guides, concepts and endpoints"
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
          }}
        />
        <div className="results" role="listbox">
          {isRequestId && <div className="none">Request lookup isn&apos;t connected yet. When it is, pasting a request ID here opens that request.</div>}
          {q && !hits.length && !isRequestId && <div className="none">Nothing matches &ldquo;{q}&rdquo;.</div>}
          {hits.map((h, i) => (
            <a key={h.url + i} href={h.url} className="result-item" role="option" aria-selected={i === sel} onClick={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}>
              <span className="rt">
                {h.method && <span className={`verb ${h.method}`}>{h.method.toUpperCase()}</span>}
                {h.title}
              </span>
              {h.snippet && <small>{h.snippet}</small>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
