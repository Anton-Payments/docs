'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LANGS, highlightCode, highlightJson, sample, type Lang, type MockResponse, type SampleInput } from '@/lib/samples';
import { TRY_STATE, type TryState } from '@/components/reference/try-mode';
import { indexLines, lineTokens, proseTokens, splitHtmlLines, type LineIndex } from '@/lib/code-lines';
import { GUIDE_SET } from '@/components/mdx/decision';
import { CopyButton } from '@/components/ui/copy-button';

/*
  The code that follows along. Every runnable step and code block in a guide is marked
  [data-pane]; this column shows whichever one the reader has scrolled to, so the prose stays
  clean on the left and the exact thing to send sits on the right. Below 1280px the column is
  hidden and the same code shows inline; on a reference page (sheet) it becomes a bottom sheet
  instead, since the reference has no inline code.

  It is the one place a request lives: the bottom console it used to share the screen with is
  gone. Nothing is sent from the docs yet, and the tile says so: it reports how much of the
  request the guide has built, what Try mode still needs, or that the response is the example.

  The text and the code point at each other. A field named in the prose (inline code) is linked
  to its line: the section you are reading lights its lines, hovering a field lights its own, and
  clicking a line scrolls to where the text explains it. A live <Choice set={...}> rewrites the
  request, and the lines it changed flash.
*/

type Item = {
  el: HTMLElement;
  kind: 'run' | 'code';
  title: string;
  section: string;
  sec: number;
  group: number;
  req?: SampleInput;
  resp?: MockResponse;
  stepId?: string;
  html?: string;
  text?: string;
};

function collect(): Item[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('main.g2 .prose h2, main.g2 .prose [data-pane]'));
  const items: Item[] = [];
  let section = '';
  let group = -1;
  let lastSection = '\u0000';
  let sec = -1;
  for (const n of nodes) {
    if (n.tagName === 'H2') {
      section = n.textContent?.replace(/#$/, '').trim() || '';
      sec++;
      continue;
    }
    if (n.parentElement?.closest('[data-pane]')) continue;
    const kind = n.dataset.pane === 'run' ? 'run' : 'code';
    // code blocks in the same section become tabs of one pane; a runnable step is always its own
    if (kind === 'run' || section !== lastSection || items[items.length - 1]?.kind === 'run') group++;
    lastSection = section;
    const pre = n.querySelector('pre');
    items.push({
      el: n,
      kind,
      title: n.dataset.title || (kind === 'run' ? 'Request' : 'Code'),
      section,
      sec,
      group,
      req: n.dataset.req ? JSON.parse(n.dataset.req) : undefined,
      resp: n.dataset.resp ? JSON.parse(n.dataset.resp) : undefined,
      stepId: n.dataset.step,
      html: pre?.innerHTML,
      text: pre?.textContent || '',
    });
  }
  return items;
}

const PROSE_CODE = 'main.g2 .prose :not(pre) > code, main.g2 .prose .choice .mono';
const LINE_H = 21;
const EMPTY = new Set<number>();

/**
 * Fields a reader's choices have rewritten. A choice applies only to a request that already has
 * one of its keys; then every key is set, and a `null` removes one (so a choice can swap a block).
 * Keys "$path.x", "$query.x" and "$header.x" set a path parameter, a query parameter or a header
 * (the Try it form sends those).
 */
function applySet(req: SampleInput, set: Record<string, unknown>): SampleInput {
  const keys = Object.keys(set);
  const own = keys.filter((k) => k.startsWith('$'));
  const isObj = !!req.body && typeof req.body === 'object' && !Array.isArray(req.body);
  const body = isObj ? { ...(req.body as Record<string, unknown>) } : undefined;
  if (!own.length && (!body || !keys.some((k) => k in body))) return req;
  const next: SampleInput = { ...req, pathParams: { ...(req.pathParams || {}) }, query: { ...(req.query || {}) }, headers: { ...(req.headers || {}) } };
  for (const [k, v] of Object.entries(set)) {
    const [where, name] = k.startsWith('$') ? [k.slice(1, k.indexOf('.')), k.slice(k.indexOf('.') + 1)] : ['body', k];
    const target = where === 'path' ? next.pathParams! : where === 'query' ? next.query! : where === 'header' ? next.headers! : body;
    if (!target) continue;
    if (v === null || v === '') delete target[name];
    else (target as Record<string, unknown>)[name] = v;
  }
  if (body) next.body = body;
  return next;
}

const linesFor = (idx: LineIndex, toks: Iterable<string>) => {
  const s = new Set<number>();
  for (const t of toks) for (const i of idx.get(t) || []) s.add(i);
  return s;
};

const WIDE = '(min-width: 1280px)';

export function GuidePane({ startOpen = false, sheet = false }: { startOpen?: boolean; sheet?: boolean }) {
  const path = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [sec, setSec] = useState(-1);
  const [pinned, setPinned] = useState<{ i: number; sec: number } | null>(null);
  const [lang, setLang] = useState<Lang>('curl');
  const [showResp, setShowResp] = useState(true);
  const [open, setOpen] = useState(startOpen);
  // a panel that starts open is simply there; only a later opening animates
  const [settled, setSettled] = useState(startOpen);
  const [overPane, setOverPane] = useState(false);
  const [peekUntil, setPeekUntil] = useState(0);
  const [set, setSet] = useState<Record<string, unknown>>({});
  const [tokBySec, setTokBySec] = useState<Map<number, Set<string>>>(new Map());
  const [hotToks, setHotToks] = useState<string[]>([]);
  const [changed, setChanged] = useState<Set<number>>(EMPTY);
  const [tryState, setTryState] = useState<TryState>({ on: false, missing: [], invalid: [] });
  const [mod, setMod] = useState('Ctrl+');
  useEffect(() => { if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod('⌘'); }, []);
  const secRef = useRef(-1);
  secRef.current = sec;
  const codeRef = useRef<HTMLDivElement>(null);
  const respRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(collect());
    setPinned(null);
    setSet({});
  }, [path]);

  // what Try mode still needs, for the tile
  useEffect(() => {
    const on = (e: Event) => setTryState((e as CustomEvent<TryState>).detail);
    window.addEventListener(TRY_STATE, on);
    return () => window.removeEventListener(TRY_STATE, on);
  }, []);

  // with room to spare the panel starts open (a sheet on a narrow screen starts folded);
  // Escape folds it away and Cmd/Ctrl+J opens or folds it
  useEffect(() => {
    if ((startOpen && window.matchMedia(WIDE).matches) || window.matchMedia('(min-width: 1720px)').matches) setOpen(true);
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, []);

  // as a bottom sheet it never covers the field being edited: focusing one folds it
  useEffect(() => {
    if (!sheet) return;
    const focus = (e: FocusEvent) => {
      if (window.matchMedia(WIDE).matches) return;
      if ((e.target as HTMLElement).closest?.('main .tf-in, main .tf-file, main .tf-secret')) { setOpen(false); setOverPane(false); }
    };
    document.addEventListener('focusin', focus);
    return () => document.removeEventListener('focusin', focus);
  }, [sheet]);

  // the dock rides above the footer instead of covering it, and steps away only when there is
  // no room left for it at all
  const [away, setAway] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const foot = document.querySelector<HTMLElement>('footer.sf');
    if (!foot) return;
    let raf = 0;
    const place = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const lift = Math.max(0, window.innerHeight - foot.getBoundingClientRect().top);
        paneRef.current?.style.setProperty('--dock-lift', `${lift}px`);
        setAway(window.innerHeight - lift < 220);
      });
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      cancelAnimationFrame(raf);
    };
  }, [path]);

  // locked open, the panel is docked: the article steps aside instead of being covered
  useEffect(() => {
    document.documentElement.classList.toggle('dock-locked', open);
    document.documentElement.classList.toggle('dock-free', !open);
    return () => document.documentElement.classList.remove('dock-locked', 'dock-free');
  }, [open]);

  // a live choice in the prose rewrites fields of the request, and shows the reader the change
  useEffect(() => {
    const on = (e: Event) => {
      setSet((s) => ({ ...s, ...((e as CustomEvent).detail || {}) }));
      if (!(e as Event & { quiet?: boolean }).quiet) setPeekUntil(Date.now() + 2400);
    };
    window.addEventListener(GUIDE_SET, on);
    return () => window.removeEventListener(GUIDE_SET, on);
  }, []);

  // which section is being read: the last heading above the upper third of the screen
  useEffect(() => {
    const h2s = Array.from(document.querySelectorAll<HTMLElement>('main.g2 .prose h2'));
    let raf = 0;
    const spy = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.4;
        let n = -1;
        h2s.forEach((h, i) => { if (h.getBoundingClientRect().top < line) n = i; });
        // the end of the page counts as the last section, however short it is
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) n = h2s.length - 1;
        setSec(n);
      });
    };
    spy();
    window.addEventListener('scroll', spy, { passive: true });
    const clicks = items.map((it, i) => {
      const h = (e: Event) => {
        const t = e.target as HTMLElement;
        if (t.closest('a') || t.closest('.rs-actions')) return;
        setPinned({ i, sec: secRef.current });
        setOpen(true);
        // a tab switch inside the block changes its code: read it again
        window.setTimeout(() => setItems(collect()), 30);
      };
      it.el.addEventListener('click', h);
      return () => it.el.removeEventListener('click', h);
    });
    return () => {
      window.removeEventListener('scroll', spy);
      cancelAnimationFrame(raf);
      clicks.forEach((f) => f());
    };
  }, [items]);

  // a click pins an item until the reader moves on to another section
  useEffect(() => { setPinned((p) => (p && p.sec !== sec ? null : p)); }, [sec]);

  // the pane works toward the next step: the first item at or after the section being read
  const auto = items.findIndex((it) => it.sec >= sec);
  const active = pinned ? pinned.i : auto >= 0 ? auto : Math.max(0, items.length - 1);
  const cur = items[active];

  // mark the in-flow element (and its tab siblings) the pane is showing
  useEffect(() => {
    items.forEach((it) => {
      if (cur && it.group === cur.group) it.el.dataset.active = 'true';
      else delete it.el.dataset.active;
    });
  }, [items, cur]);

  const tabs = useMemo(() => (cur && cur.kind === 'code' ? items.map((it, i) => ({ it, i })).filter((x) => x.it.group === cur.group) : []), [items, cur]);
  const full = cur?.kind === 'run' && cur.req ? applySet(cur.req, set) : undefined;

  // the full request, indexed, is what the prose links against
  const fullIdx = useMemo(() => (full ? indexLines(splitHtmlLines(highlightCode(sample(lang, full), lang))) : new Map() as LineIndex), [full, lang]);
  const respBody = cur?.resp && full ? applySet({ ...full, body: cur.resp.body }, set).body : cur?.resp?.body;
  const json = cur?.resp ? JSON.stringify(respBody, null, 2) : '';
  const rlines = useMemo(() => splitHtmlLines(highlightJson(json)), [json]);
  const ridx = useMemo(() => indexLines(rlines), [rlines]);

  // the request is built as the guide is read: each field arrives with the section that first
  // explains it, and by the step that sends it, all of it is there
  const prevSec = useMemo(() => {
    const before = items.slice(0, active).filter((it) => it.kind === 'run');
    return before.length ? before[before.length - 1].sec : -Infinity;
  }, [items, active]);
  const built = useMemo(() => {
    if (!full || !cur || sec >= cur.sec) return { req: full, shown: 0, total: 0, done: true };
    const headerNames = new Set(Object.keys(full.headers || {}));
    const arrives = (k: string) => {
      for (let s2 = Math.max(prevSec + 1, -1); s2 <= cur.sec; s2++) if (tokBySec.get(s2)?.has(k)) return s2;
      // a header explained only after the step still arrives with the step; an unexplained body
      // field (who is paid, and with what) is there from the start
      return headerNames.has(k) ? cur.sec : -Infinity;
    };
    const keep = (k: string) => arrives(k) <= sec;
    const body = full.body && typeof full.body === 'object' && !Array.isArray(full.body)
      ? Object.fromEntries(Object.entries(full.body as Record<string, unknown>).filter(([k]) => keep(k)))
      : full.body;
    const headers = full.headers ? Object.fromEntries(Object.entries(full.headers).filter(([k]) => keep(k))) : undefined;
    const all = [...Object.keys((full.body as object) || {}), ...Object.keys(full.headers || {})];
    const shown = all.filter(keep).length;
    return { req: { ...full, body, headers }, shown, total: all.length, done: false };
  }, [full, cur, sec, prevSec, tokBySec]);

  const req = built.req;
  const code = req ? sample(lang, req) : cur?.text || '';
  const html = req ? highlightCode(code, lang) : cur?.html || '';
  const lines = useMemo(() => splitHtmlLines(html.replace(/\n$/, '')), [html]);
  const idx = useMemo(() => indexLines(lines), [lines]);

  // lines that change, from a choice or from reading on, flash once
  const prev = useRef<{ key: string; lines: string[] }>({ key: '', lines: [] });
  useEffect(() => {
    const key = `${active}|${lang}|${items.length}|${cur?.title}|${tokBySec.size}`;
    const p = prev.current;
    prev.current = { key, lines };
    if (p.key !== key || !p.lines.length) return;
    const was = new Set(p.lines);
    const diff = new Set<number>();
    lines.forEach((l, i) => { if (!was.has(l)) diff.add(i); });
    if (!diff.size) return;
    setChanged(diff);
    const first = Math.min(...diff);
    const box = codeRef.current;
    if (box) box.scrollTo({ top: Math.max(0, first * LINE_H - box.clientHeight / 3), behavior: 'smooth' });
    const t = window.setTimeout(() => setChanged(EMPTY), 1600);
    return () => clearTimeout(t);
  }, [lines, active, lang]);

  // link the prose: every inline field the code carries becomes a pointer to its line
  useEffect(() => {
    const h2s = Array.from(document.querySelectorAll<HTMLElement>('main.g2 .prose h2'));
    const els = Array.from(document.querySelectorAll<HTMLElement>(PROSE_CODE));
    const bySec = new Map<number, Set<string>>();
    for (const el of els) {
      const toks = proseTokens(el.textContent || '').filter((t) => fullIdx.has(t) || ridx.has(t));
      if (!toks.length) { el.classList.remove('lk'); delete el.dataset.tok; continue; }
      el.classList.add('lk');
      el.dataset.tok = toks.join(' ');
      let n = -1;
      h2s.forEach((h, i) => { if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) n = i; });
      el.dataset.sec = String(n);
      const set2 = bySec.get(n) || new Set<string>();
      toks.forEach((t) => set2.add(t));
      bySec.set(n, set2);
    }
    setTokBySec((old) => (JSON.stringify([...old].map(([k, v]) => [k, [...v]])) === JSON.stringify([...bySec].map(([k, v]) => [k, [...v]])) ? old : bySec));
    const over = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('.lk');
      if (t) setHotToks((t.dataset.tok || '').split(' '));
    };
    // the panel lingers a moment, long enough to reach it and press Keep open
    const out = (e: Event) => { if ((e.target as HTMLElement).closest('.lk')) { setHotToks([]); setPeekUntil(Date.now() + 1200); } };
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, [fullIdx, ridx]);

  useEffect(() => {
    if (!peekUntil) return;
    const t = window.setTimeout(() => setPeekUntil(0), Math.max(0, peekUntil - Date.now()));
    return () => clearTimeout(t);
  }, [peekUntil]);

  const secToks = useMemo(() => [...(tokBySec.get(sec) || [])], [tokBySec, sec]);
  const showResponse = !!cur?.resp && built.done;
  const expanded = open || overPane || hotToks.length > 0 || peekUntil > 0;
  useEffect(() => { if (!expanded) setSettled(false); }, [expanded]);
  const hot = useMemo(() => linesFor(idx, hotToks), [idx, hotToks]);
  const rhot = useMemo(() => (showResponse ? linesFor(ridx, hotToks) : EMPTY), [ridx, hotToks, showResponse]);
  const lit = useMemo(() => (hot.size || rhot.size ? EMPTY : linesFor(idx, secToks)), [idx, secToks, hot, rhot]);
  const rlit = useMemo(() => (hot.size || rhot.size || !showResponse ? EMPTY : linesFor(ridx, secToks)), [ridx, secToks, hot, rhot, showResponse]);

  // the lines being pointed at come into view inside the pane, never by moving the page
  useEffect(() => {
    for (const [box, s] of [[codeRef.current, hot.size ? hot : lit], [respRef.current, rhot.size ? rhot : rlit]] as const) {
      if (!box || !s.size) continue;
      const first = Math.min(...s);
      const top = first * LINE_H;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - LINE_H * 3) box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' });
    }
  }, [hot, rhot, lit, rlit]);

  // clicking a line scrolls the text to where it is explained
  const jump = useCallback((text: string) => {
    const toks = lineTokens(text);
    const target = Array.from(document.querySelectorAll<HTMLElement>('.lk')).find((el) => (el.dataset.tok || '').split(' ').some((t) => toks.includes(t)));
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
    window.scrollTo({ top: y, behavior: 'smooth' });
    target.classList.remove('flash');
    void target.offsetWidth;
    target.classList.add('flash');
    window.setTimeout(() => target.classList.remove('flash'), 1800);
  }, []);


  // the tile says what's true: how far the guide has built the request, what Try mode still
  // needs, or that the response shown is the example
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const tileText =
    cur?.kind !== 'run' ? cur?.section || ''
    : !built.done ? `${built.shown} of ${built.total} fields`
    : tryState.on && tryState.missing.length ? `${plural(tryState.missing.length, 'required field', 'required fields')} to set`
    : tryState.on && tryState.invalid.length ? `${plural(tryState.invalid.length, 'field', 'fields')} to fix`
    : 'Example · not sent';
  const tileWarn = cur?.kind === 'run' && built.done && tryState.on && (tryState.missing.length > 0 || tryState.invalid.length > 0);

  const verb = cur?.req?.method.toLowerCase();

  return (
    <aside
      ref={paneRef}
      className={`gpane ${sheet ? 'sheet' : ''} ${built.done ? '' : 'building'} ${expanded ? 'x' : ''} ${away ? 'away' : ''} ${settled ? 'settled' : ''}`}
      aria-label="Code for this guide"
      onMouseEnter={() => setOverPane(true)}
      onMouseLeave={() => setOverPane(false)}
    >
      <div className="gp-stack">
      <div className="gp-box">
        <div className="gp-head">
          <span className="gp-wd" aria-hidden="true"><i /><i /><i /></span>
          <div className="gp-tabs" role="tablist">
            {cur?.kind === 'run'
              ? LANGS.map((l) => (
                  <button key={l.id} role="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
                ))
              : tabs.map(({ it, i }) => (
                  <button key={i} role="tab" aria-selected={i === active} onClick={() => setPinned({ i, sec })}>{it.title}</button>
                ))}
          </div>
          <CopyButton text={code} label="Copy code" />
        </div>
        <div className="gp-code" ref={codeRef} key={`c-${active}-${lang}`}>
          <Lines lines={lines} lit={lit} hot={hot} changed={changed} onPick={jump} />
        </div>
        <div className="gp-foot">
          {cur?.kind === 'run' ? (
            <>
              <span className="gp-note">Not sent from the docs. Run it from your code.</span>
              <span style={{ flex: 1 }} />
              <span className="gp-keys" aria-hidden="true"><kbd>{mod}J</kbd> fold</span>
            </>
          ) : (
            <span className="gp-id dim">{items.length ? `${active + 1} of ${items.length} on this page` : ''}</span>
          )}
        </div>
      </div>
      {cur?.kind === 'run' && cur.resp && showResponse && (
        <div className={`gp-box gp-resp ${showResp ? 'open' : ''}`}>
          <div className="gp-resp-h">
            <button className="gp-resp-t" onClick={() => setShowResp((s) => !s)} aria-expanded={showResp}>
              <span className="gp-rl">Response</span>
              <span className={`gp-st ${cur.resp.status < 300 ? 'ok' : 'bad'}`}>{cur.resp.status} {({ 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content' } as Record<number, string>)[cur.resp.status] || ''}</span>
              <span className="gp-ex">Example</span>
              <svg className="gp-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <CopyButton text={json} label="Copy response" />
          </div>
          {showResp && (
            <div className="gp-code gp-rcode" ref={respRef}>
              <Lines lines={rlines} lit={rlit} hot={rhot} changed={EMPTY} onPick={jump} />
            </div>
          )}
        </div>
      )}
      </div>
        {cur && (
          <div className="gp-dock">
            <button className="gp-tile" onClick={() => setOpen((o) => !o)} aria-expanded={expanded}>
              {cur.kind === 'run' && cur.req ? (
                <span className="gp-ep"><b className={`verb ${verb}`}>{cur.req.method.toUpperCase()}</b>{cur.req.path}</span>
              ) : (
                <span className="gp-ep">{cur.title}</span>
              )}
              <span className={`gp-what ${tileWarn ? 'warn' : ''}`} title={tileText}>{tileText}</span>
              <svg className="gp-tog" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>

            </button>
            <button
              className={`gp-lock ${open ? 'on' : ''}`}
              onClick={() => setOpen((o) => !o)}
              aria-pressed={open}
              aria-label={open ? 'Unlock the code panel' : 'Lock the code panel open'}
              title={open ? 'Unlock: folds away when you read on (Esc, or Cmd+J)' : 'Lock open while you read (Cmd+J)'}
            >
              {open ? (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></svg>
              )}
            </button>
          </div>
        )}
    </aside>
  );
}

function Lines({ lines, lit, hot, changed, onPick }: { lines: string[]; lit: Set<number>; hot: Set<number>; changed: Set<number>; onPick: (text: string) => void }) {
  const focus = hot.size > 0 || lit.size > 0;
  return (
    <div className={`gl-all ${focus ? 'focus' : ''}`}>
      {lines.map((l, i) => {
        const cls = hot.has(i) ? 'hot' : lit.has(i) ? 'on' : '';
        return (
          <div
            key={i}
            className={`gl ${cls} ${changed.has(i) ? 'chg' : ''}`}
            onClick={(e) => onPick((e.currentTarget.lastChild as HTMLElement)?.textContent || '')}
          >
            <span className="gn" aria-hidden="true">{i + 1}</span>
            <span className="gt" dangerouslySetInnerHTML={{ __html: l || ' ' }} />
          </div>
        );
      })}
    </div>
  );
}
