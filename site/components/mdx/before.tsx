'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** A checklist the reader ticks off before starting a guide. Remembered per page in this browser. */
export function BeforeYouBegin({ items }: { items: string[] }) {
  const path = usePathname();
  const key = `anton-docs-before:${path}`;
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(v)) setDone(items.map((_, i) => !!v[i]));
    } catch {
      /* nothing saved */
    }
  }, [key, items]);
  const flip = (i: number) =>
    setDone((d) => {
      const n = d.map((x, j) => (j === i ? !x : x));
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* storage refused */
      }
      return n;
    });
  return (
    <div className="before">
      <b>Before you begin</b>
      <ul>
        {items.map((t, i) => (
          <li key={t}>
            <button aria-pressed={done[i]} onClick={() => flip(i)}>
              <span className="bx" aria-hidden="true">{done[i] ? '✓' : ''}</span>
              <span className="bt">{t}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
