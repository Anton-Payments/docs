'use client';

import { useEffect, useState, type ReactNode } from 'react';

export type TocItem = { title: ReactNode; url: string; depth: number };

export function Toc({ items, children }: { items: TocItem[]; children?: ReactNode }) {
  const [active, setActive] = useState<string>('');
  useEffect(() => {
    const ids = items.map((i) => i.url.replace('#', ''));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);
  if (!items.length && !children) return null;
  return (
    <aside className="toc" aria-label="On this page">
      {items.length > 0 && <b>On this page</b>}
      {items.filter((i) => i.depth <= 3).map((i) => (
        <a key={i.url} href={i.url} className={`${i.depth === 3 ? 'd3' : ''} ${active === i.url.slice(1) ? 'active' : ''}`}>{i.title}</a>
      ))}
      {children}
    </aside>
  );
}
