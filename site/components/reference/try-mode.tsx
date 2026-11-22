'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUIDE_SET } from '@/components/mdx/decision';
import type { SampleInput } from '@/lib/samples';
import { check, display, keyOf, value, type FormField } from '@/lib/try-fields';

/*
  Try mode: the endpoint page you're reading becomes the form. Each parameter and body row grows
  an input in place (into the empty slot the server left in it), and every change rewrites the
  request in the code panel. Read and Try are one page, so switching keeps your place and your
  values. Values are kept per endpoint for the visit (sessionStorage), never sent anywhere.
*/

const MODE_EVENT = 'anton:try-mode';
/** Try mode's state, for the code panel's tile: which required fields are empty and which are wrong. */
export const TRY_STATE = 'anton:try-state';
/** Try mode went back to the page's first example: the example switch follows. */
export const TRY_RESET = 'anton:try-reset';
export type TryState = { on: boolean; missing: string[]; invalid: string[] };

const isTry = () => typeof window !== 'undefined' && window.location.hash === '#try';

function setMode(on: boolean) {
  const url = window.location.pathname + window.location.search + (on ? '#try' : '');
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(MODE_EVENT));
}

function useTryMode() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(isTry());
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener(MODE_EVENT, read);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener(MODE_EVENT, read);
    };
  }, []);
  return on;
}

/** Read or Try, in the page header. */
export function ModeSwitch() {
  const on = useTryMode();
  return (
    <div className="seg2" role="group" aria-label="Mode">
      <button type="button" aria-pressed={!on} onClick={() => setMode(false)}>Read</button>
      <button type="button" aria-pressed={on} onClick={() => setMode(true)} title="Fill in the fields and the request in the code panel follows">Try</button>
    </div>
  );
}

const store = {
  read(key: string): Record<string, string> | null {
    try {
      const v = sessionStorage.getItem(key);
      return v ? (JSON.parse(v) as Record<string, string>) : null;
    } catch {
      return null;
    }
  },
  write(key: string, v: Record<string, string> | null) {
    try {
      if (v) sessionStorage.setItem(key, JSON.stringify(v));
      else sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable: values last until the page is left */
    }
  },
};

function fromRequest(fields: FormField[], req: SampleInput): Record<string, string> {
  const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}) as Record<string, unknown>;
  return Object.fromEntries(
    fields.map((f) => {
      const v = f.in === 'path' ? req.pathParams?.[f.name] : f.in === 'query' ? req.query?.[f.name] : f.in === 'header' ? req.headers?.[f.name] : body[f.name];
      return [keyOf(f), display(f, v)];
    }),
  );
}

export function TryController({ fields, initial, storageKey }: { fields: FormField[]; initial: SampleInput; storageKey: string }) {
  const on = useTryMode();
  const example = useMemo(() => fromRequest(fields, initial), [fields, initial]);
  const [vals, setVals] = useState<Record<string, string>>(example);
  const [edited, setEdited] = useState(false);
  const [slots, setSlots] = useState<Map<string, HTMLElement>>(new Map());
  const [statusEl, setStatusEl] = useState<HTMLElement | null>(null);
  const lastSent = useRef<unknown>(null);

  // the slots the server left in each row, and values kept from earlier in this visit
  useEffect(() => {
    const m = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>('[data-try-slot]').forEach((el) => m.set(el.dataset.trySlot!, el));
    setSlots(m);
    setStatusEl(document.querySelector<HTMLElement>('[data-try-status]'));
    const saved = store.read(storageKey);
    if (saved) {
      setVals((v) => ({ ...v, ...saved }));
      setEdited(true);
    }
  }, [storageKey]);

  useEffect(() => {
    const main = document.querySelector('main.ref');
    main?.classList.toggle('try-on', on);
    return () => main?.classList.remove('try-on');
  }, [on]);

  // every change rewrites the request in the panel
  useEffect(() => {
    const t = setTimeout(() => {
      const detail = Object.fromEntries(fields.map((f) => [keyOf(f), value(f, vals[keyOf(f)] ?? '')]));
      lastSent.current = detail;
      // quiet: typing in a field never pops the code panel open over the page
      window.dispatchEvent(Object.assign(new CustomEvent(GUIDE_SET, { detail }), { quiet: true }));
    }, 120);
    return () => clearTimeout(t);
  }, [vals, fields]);

  // a request example picked in the page sets the fields it carries
  useEffect(() => {
    const on2 = (e: Event) => {
      const d = (e as CustomEvent).detail as Record<string, unknown> | undefined;
      if (!d || d === lastSent.current) return;
      setVals((v) => {
        const next = { ...v };
        for (const f of fields) if (keyOf(f) in d) next[keyOf(f)] = display(f, d[keyOf(f)]);
        store.write(storageKey, next);
        return next;
      });
      setEdited(true);
    };
    window.addEventListener(GUIDE_SET, on2);
    return () => window.removeEventListener(GUIDE_SET, on2);
  }, [fields, storageKey]);

  const missing = fields.filter((f) => f.required && f.kind !== 'secret' && !vals[keyOf(f)]).map((f) => f.name);
  const invalid = fields.filter((f) => vals[keyOf(f)] && check(f, vals[keyOf(f)])).map((f) => f.name);
  const stateKey = `${on}|${missing.join()}|${invalid.join()}`;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<TryState>(TRY_STATE, { detail: { on, missing, invalid } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);
  useEffect(() => () => { window.dispatchEvent(new CustomEvent<TryState>(TRY_STATE, { detail: { on: false, missing: [], invalid: [] } })); }, []);

  const set = useCallback((k: string, v: string) => {
    setVals((s) => {
      const next = { ...s, [k]: v };
      store.write(storageKey, next);
      return next;
    });
    setEdited(true);
  }, [storageKey]);

  const reset = () => {
    store.write(storageKey, null);
    setVals(example);
    setEdited(false);
    window.dispatchEvent(new Event(TRY_RESET));
  };

  if (!on) return null;
  const required = fields.filter((f) => f.required && f.kind !== 'secret').length;
  return (
    <>
      {statusEl && createPortal(
        <div className={`tf-state ${missing.length || invalid.length ? 'bad' : 'ok'}`} role="status">
          <span>
            {missing.length > 0
              ? `${missing.length} required field${missing.length > 1 ? 's' : ''} to set: ${missing.join(', ')}`
              : invalid.length > 0
                ? `${invalid.length} field${invalid.length > 1 ? 's' : ''} to fix: ${invalid.join(', ')}`
                : required ? 'Every required field is set.' : 'Nothing is required.'}
          </span>
          {edited && <button type="button" className="linkbtn" onClick={reset}>Reset to the example</button>}
        </div>,
        statusEl,
      )}
      {fields.map((f) => {
        const el = slots.get(keyOf(f));
        return el ? createPortal(<Input key={keyOf(f)} f={f} v={vals[keyOf(f)] ?? ''} set={(v) => set(keyOf(f), v)} />, el) : null;
      })}
    </>
  );
}

function Input({ f, v, set }: { f: FormField; v: string; set: (v: string) => void }) {
  const id = `try-${f.in}-${f.name}`;
  const err = v ? check(f, v) : null;
  const label = `${f.name}${f.required ? ' (required)' : ''}`;
  if (f.kind === 'secret') {
    return (
      <label className="tf-secret" htmlFor={id}>
        <input id={id} type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked ? 'on' : '')} />
        <span>Send it in the body, read from <code>${f.envVar}</code> in your code</span>
      </label>
    );
  }
  if (f.kind === 'file') {
    return (
      <div className="tf-file">
        <label className="btn sm" htmlFor={id}>Choose a file</label>
        <input id={id} type="file" className="sr-only" accept=".csv,.xlsx,text/csv" onChange={(e) => set(e.target.files?.[0]?.name || '')} />
        <span className="tf-fname">{v ? <code>{v}</code> : 'No file chosen'}</span>
        <span className="tf-hint">Only the file name goes into the code. The file stays on your computer.</span>
      </div>
    );
  }
  return (
    <>
      {f.kind === 'enum' || f.kind === 'boolean' ? (
        <select id={id} className="tf-in" value={v} onChange={(e) => set(e.target.value)} aria-invalid={!!err} aria-label={label}>
          <option value="">{f.required ? 'Choose one' : 'Not sent'}</option>
          {(f.kind === 'boolean' ? ['true', 'false'] : f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.kind === 'json' ? (
        <textarea id={id} className="tf-in tf-json" value={v} onChange={(e) => set(e.target.value)} spellCheck={false} aria-invalid={!!err} aria-label={label} placeholder={f.required ? '' : 'Not sent'} />
      ) : (
        <input id={id} className="tf-in" value={v} onChange={(e) => set(e.target.value)} spellCheck={false} autoComplete="off" inputMode={f.kind === 'number' || f.decimal ? 'decimal' : undefined} placeholder={f.required ? '' : 'Not sent'} aria-invalid={!!err} aria-label={label} />
      )}
      {err && <span className="tf-err">{err}</span>}
    </>
  );
}
