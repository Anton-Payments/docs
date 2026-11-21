'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export type SideSection = { title: string; collapsed?: boolean; steps?: number; items: { title: string; href: string; method?: string }[] };

export function Sidebar({ sections }: { sections: SideSection[] }) {
  const path = usePathname();
  useEffect(() => {
    document.querySelector('.side')?.classList.remove('open');
    document.querySelector('.side a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [path]);
  return (
    <aside className="side" aria-label="Navigation">
      <div className="side-scroll">
        {sections.flatMap((s) => {
          const k = s.steps || 0;
          // a numbered sequence at the top of a section is drawn as its own group: the core path
          const groups = k ? [{ title: 'Core path', items: s.items.slice(0, k), numbered: true }, { title: 'Go further', items: s.items.slice(k), numbered: false }] : [{ title: s.title, items: s.items, numbered: false }];
          return groups.map((g) => {
            const active = g.items.some((i) => i.href === path);
            const list = (
              <ul>
                {g.items.map((i, n) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={i.href === path ? 'page' : undefined}>
                      {g.numbered && <span className="step-n">{String(n + 1).padStart(2, '0')}</span>}
                      {i.method && <span className={`verb ${i.method}`}>{i.method.toUpperCase()}</span>}
                      <span className="lbl">{i.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            );
            return (
              <div key={g.title} className="sgroup">
                {s.collapsed ? (
                  <details open={active}>
                    <summary><h6>{g.title}</h6></summary>
                    {list}
                  </details>
                ) : (
                  <>
                    <h6>{g.title}</h6>
                    {list}
                  </>
                )}
              </div>
            );
          });
        })}
      </div>
    </aside>
  );
}
