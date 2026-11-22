'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export type SideSection = { title: string; collapsed?: boolean; numbered?: boolean; items: { title: string; href: string; method?: string }[] };

export function Sidebar({ sections, top }: { sections: SideSection[]; top?: ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    document.querySelector('.side')?.classList.remove('open');
    document.querySelector('.side a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [path]);
  return (
    <aside className="side" aria-label="Navigation">
      <div className="side-scroll">
        {top}
        {sections.flatMap((s) => {
          const groups = [{ title: s.title, items: s.items, numbered: !!s.numbered }];
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
