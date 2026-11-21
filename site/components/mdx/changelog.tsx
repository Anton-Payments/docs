'use client';

import type { ReactNode } from 'react';

const TAG_TONE: Record<string, string> = { Added: 'ok', Changed: 'warn', Removed: 'bad', Fixed: 'info', Deprecated: 'warn', Versioning: 'accent' };

/** The list of entries. (An "affects me" filter returns with sign-in, when it can know what you use.) */
export function ChangelogFilter({ children }: { children: ReactNode }) {
  return <div className="log">{children}</div>;
}

export function Entry({ date, title, tags, children }: { date: string; title: string; tags?: string; children: ReactNode }) {
  const id = `${date}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <section className="entry" id={id}>
      <div className="date">{date}</div>
      <div>
        <h2>
          <a href={`#${id}`} style={{ color: 'inherit' }}>{title}</a>
          {(tags || '').split(',').filter(Boolean).map((t) => (
            <span key={t} className={`pill ${TAG_TONE[t.trim()] || 'unknown'}`}>{t.trim()}</span>
          ))}
        </h2>
        <div className="prose">{children}</div>
      </div>
    </section>
  );
}
