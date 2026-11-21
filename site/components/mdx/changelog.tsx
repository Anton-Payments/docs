'use client';

import { useState, type ReactNode } from 'react';
import { useConsole, useSession } from '@/components/shell/providers';

const TAG_TONE: Record<string, string> = { Added: 'ok', Changed: 'warn', Removed: 'bad', Fixed: 'info', Deprecated: 'warn', Versioning: 'accent' };

export function ChangelogFilter({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState(false);
  const { signedIn } = useSession();
  return (
    <>
      <div className="row" style={{ marginTop: 4 }}>
        <div className="seg2" role="group" aria-label="Filter">
          <button aria-pressed={!mine} onClick={() => setMine(false)}>All changes</button>
          <button aria-pressed={mine} onClick={() => setMine(true)} disabled={!signedIn} title={signedIn ? undefined : 'Sign in to filter by your integration'}>Affects me</button>
        </div>
        {mine && <span className="example-tag">Preview data</span>}
      </div>
      <div className="log" data-mine={mine ? 'true' : undefined}>{children}</div>
      <style>{`.log[data-mine] .entry:not([data-affects]) { display: none; }`}</style>
    </>
  );
}

export function Entry({ date, title, tags, affects, children }: { date: string; title: string; tags?: string; affects?: string; children: ReactNode }) {
  const { signedIn } = useSession();
  const c = useConsole();
  const id = `${date}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <section className="entry" id={id} data-affects={affects && signedIn ? 'true' : undefined}>
      <div className="date">{date}</div>
      <div>
        <h2>
          <a href={`#${id}`} style={{ color: 'inherit' }}>{title}</a>
          {(tags || '').split(',').filter(Boolean).map((t) => (
            <span key={t} className={`pill ${TAG_TONE[t.trim()] || 'unknown'}`}>{t.trim()}</span>
          ))}
        </h2>
        {affects && signedIn && (
          <div className="affects">
            <div><b>This affects your integration</b>{affects} <span className="example-tag">Preview</span></div>
            <button
              className="btn sm pri"
              onClick={() => {
                c.setOpen(true);
                c.setTarget({
                  kind: 'request',
                  title: 'Update webhook subscription',
                  request: { method: 'patch', path: '/v1/webhooks/{id}', baseUrl: 'https://api.antonpayments.dev', pathParams: { id: 'wh_example' }, headers: { 'Idempotency-Key': 'wh-events-2026-11-09' }, body: { events: ['payout.completed', 'payout.failed', 'payout.on_hold'] } },
                  hint: 'Replaces payout.screening_failed with payout.on_hold on your endpoint.',
                });
              }}
            >
              Fix in console
            </button>
          </div>
        )}
        <div className="prose">{children}</div>
      </div>
    </section>
  );
}
