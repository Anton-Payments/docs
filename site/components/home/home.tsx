'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openSearch } from '@/components/shell/search';
import { EXCHANGES, ROUTES, type Product, type Row } from '@/lib/home-route';
import type { LatestEntry } from '@/lib/changelog';

/*
  The docs front door, built from the approved "Anton Docs Home" design: a two-product hero, then
  the route: each stage of a payout (or of an intelligence screening) with the exact HTTP exchange
  that happens there. Styles live in app/home.css under .dh.
*/

export type HrefMap = { ops: Record<string, string>; more: Record<string, string> };

const SearchIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const LABELS = ['You call', 'You hear', 'Can fail'];
const EMPTY = ['Nothing. Anton does this for you.', 'No events at this stage.', 'No errors to handle at this stage.'];
const STEP_MS = 3600;

function FactRow({ r, hrefs }: { r: Row; hrefs: HrefMap }) {
  if (r.length === 2 && r[0]) {
    const key = `${r[0].toUpperCase()} ${r[1]}`;
    return <Link href={hrefs.ops[key] || '/reference'}><span className={`v ${r[0]}`}>{r[0].toUpperCase()}</span>{r[1]}</Link>;
  }
  if (r.length === 2) return <Link href="/concepts/webhook-events">{r[1]}</Link>;
  return <Link href={`/errors#${r[2]}`}><span className={`c ${r[0]}`}>{r[1]}</span>{r[2]}</Link>;
}

export function Home({ entries, hrefs }: { entries: (LatestEntry & { when: string })[]; hrefs: HrefMap }) {
  const [prod, setProd] = useState<Product>('pay');
  const [cur, setCur] = useState(0);
  const [shown, setShown] = useState(0); // the left column swaps a beat after the stage, so its text can fade
  const [swapping, setSwapping] = useState(false);
  const [watching, setWatching] = useState(false);
  const timers = useRef<number[]>([]);
  const route = ROUTES[prod];

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const go = useCallback((i: number) => {
    setCur(i);
    setSwapping(true);
    timers.current.push(window.setTimeout(() => { setShown(i); setSwapping(false); }, 180));
  }, []);
  const stopWatch = () => { clear(); setWatching(false); };
  const pick = (i: number) => { stopWatch(); go(i); };
  const switchProd = (p: Product) => {
    if (p === prod) return;
    stopWatch(); setProd(p); setCur(0); setShown(0); setSwapping(false);
  };
  const watch = () => {
    if (watching) { stopWatch(); return; }
    clear(); setWatching(true);
    for (let k = 0; k < 6; k++) timers.current.push(window.setTimeout(() => go(k), k * STEP_MS));
    timers.current.push(window.setTimeout(() => setWatching(false), 6 * STEP_MS));
  };
  useEffect(() => () => clear(), []);

  const s = route.stages[shown];

  return (
    <div className="dh">
      <section className="wrap hero">
        <div>
          <div className="eyebrow">Anton API · version 2026-12-01</div>
          <h1>Build payouts that think.</h1>
          <p className="lede">One API for cross-border payouts, and the intelligence that checks each one before it moves. Use them together, or call either on its own.</p>
          <div className="ctas">
            <Link className="btn pri" href="/quickstart">Make your first call<Arrow /></Link>
            <Link className="btn ghost" href="/reference">API reference</Link>
          </div>
        </div>
        <div className="jump">
          <button className="find" type="button" onClick={openSearch}><SearchIcon size={17} /><span>Search guides, endpoints, error codes</span><kbd>⌘K</kbd></button>
          <div className="eyebrow">Jump to</div>
          <Link href="/reference/payouts/create-payout">Create a payout<small>POST /v1/payouts</small></Link>
          <Link href="/concepts/webhook-signing">Verify webhook signatures<small>HMAC-SHA256</small></Link>
          <Link href="/errors#amount_precision_invalid"><span><span className="c">422</span>amount_precision_invalid</span><small>Error</small></Link>
          <Link href="/concepts/idempotency">Retry safely with idempotency keys<small>Idempotency-Key</small></Link>
        </div>
      </section>

      <section className="wrap route" aria-labelledby="route-h">
        <div className="rhead">
          <div>
            <div className="prod" role="group" aria-label="Product">
              <button type="button" aria-pressed={prod === 'pay'} onClick={() => switchProd('pay')}>Payouts</button>
              <button type="button" aria-pressed={prod === 'intel'} onClick={() => switchProd('intel')}>Intelligence</button>
            </div>
            <h2 id="route-h">{route.h}</h2>
          </div>
          <div className="rside">
            <p>Filed by moment, not by endpoint.</p>
            <button className="watch" type="button" aria-pressed={watching} onClick={watch} style={{ ['--dur' as string]: `${STEP_MS * 6}ms` }}>
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d={watching ? 'M6 6h12v12H6z' : 'M7 4.5v15l12-7.5z'} fill="currentColor" /></svg>
              <span>{watching ? 'Stop' : route.watch}</span>
              {watching && <i className="bar" key={`bar-${prod}`} />}
            </button>
          </div>
        </div>

        <div className="track" role="tablist" aria-label="Stages">
          <span className="fill" aria-hidden="true" style={{ width: `calc(${(cur / 6) * 100}%)` }} />
          {route.stages.map((st, i) => (
            <button
              key={st.n + i}
              className={`stop ${i < cur ? 'done' : ''}`}
              role="tab"
              aria-selected={i === cur}
              tabIndex={i === cur ? 0 : -1}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!k) return;
                e.preventDefault();
                const n = (i + k + 6) % 6;
                pick(n);
                e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.stop')[n]?.focus();
              }}
            >
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <b>{st.n}</b>
              <span>{st.c}</span>
            </button>
          ))}
        </div>

        <div className="panel" role="tabpanel">
          <div className={`info ${swapping ? 'swapping' : ''}`}>
            <div className="eyebrow" id="p-eb">Stage {String(shown + 1).padStart(2, '0')} · {s.n}</div>
            <p id="p-p">{s.p}</p>
            <dl className="facts" id="p-f">
              {s.f.map((g, k) => (
                <div className="fact" key={k}>
                  <dt>{LABELS[k]}</dt>
                  <dd>{g.length ? g.map((r, j) => <FactRow key={j} r={r} hrefs={hrefs} />) : <span className="none">{EMPTY[k]}</span>}</dd>
                </div>
              ))}
            </dl>
            <Link className="more" href={hrefs.more[s.more] || '/'}>{s.more}<Arrow /></Link>
          </div>
          <div className="show">
            {(['pay', 'intel'] as Product[]).map((p) =>
              EXCHANGES[p].map((html, i) => (
                <div key={`${p}${i}`} className={`view ${p === prod && i === cur ? 'on' : ''}`} aria-hidden={!(p === prod && i === cur)} dangerouslySetInnerHTML={{ __html: html }} />
              )),
            )}
          </div>
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="start-h">
        <div className="sec-h"><div><div className="eyebrow">Start here</div><h2 id="start-h">From sandbox to production.</h2></div><Link href="/quickstart">Read the quickstart →</Link></div>
        <div className="trio">
          <Link href="/sandbox/overview"><h3>Build in the sandbox</h3><p>Everything production does, except move money. Payouts finish in seconds, not hours.</p><span className="go">Sandbox and test data →</span></Link>
          <Link href="/authentication"><h3>Sign every call</h3><p>Your signing key is made in your browser, and it never leaves.</p><span className="go">Authentication →</span></Link>
          <Link href="/guides/go-live"><h3>Go live</h3><p>Your code comes with you. Sandbox keys and data don't, and production opens once your account is approved.</p><span className="go">The go-live checklist →</span></Link>
        </div>
      </section>

      <section className="wrap sec" aria-label="Reference and changelog">
        <div className="two">
          <div>
            <div className="sub-h"><h3>API reference</h3><Link href="/reference">Every endpoint →</Link></div>
            <div className="list">
              <Link href="/reference/payouts/create-payout"><b>Payouts</b><small>/v1/payouts</small></Link>
              <Link href="/reference/beneficiaries/create-beneficiary"><b>Payees</b><small>/v1/beneficiaries</small></Link>
              <Link href="/reference/instruments/create-instrument"><b>Instruments</b><small>/v1/instruments</small></Link>
              <Link href="/reference/pricing/create-pricing-quote"><b>Pricing and FX</b><small>/v1/pricing/quotes</small></Link>
              <Link href="/reference/webhooks/create-webhook-subscription"><b>Webhooks</b><small>/v1/webhooks</small></Link>
              <Link href="/reference/intelligence/create-evaluation"><b>Intelligence</b><small>/v1/intelligence</small></Link>
            </div>
          </div>
          <div>
            <div className="sub-h"><h3>What&apos;s new</h3><Link href="/changelog">Changelog →</Link></div>
            <div className="news">
              {entries.map((e) => (
                <Link key={e.href} href={e.href}><time>{e.when}</time><b>{e.title}</b>{e.summary && <span>{e.summary}</span>}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
