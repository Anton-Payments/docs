'use client';

import { useEffect, useMemo, useState } from 'react';
import { GUIDE_SET } from '@/components/mdx/decision';
import type { SampleInput } from '@/lib/samples';

/*
  Try it: build a request against the contract. Every field is a row in the reference's style
  with an input beside it; each change rewrites the request in the code panel (in five languages)
  and the changed lines flash. Checks run as you type: required fields, enum values, decimal
  strings, JSON. Nothing is sent: the response shown is the documented example.
*/

export type FormField = {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'json';
  options?: string[];
  description?: string;
  type?: string;
  /** a decimal amount, sent as a string */
  decimal?: boolean;
};

const keyOf = (f: FormField) => (f.in === 'body' ? f.name : `$${f.in}.${f.name}`);

function initialValue(f: FormField, req: SampleInput): string {
  if (f.in === 'path') return req.pathParams?.[f.name] ?? '';
  if (f.in === 'query') return req.query?.[f.name] ?? '';
  if (f.in === 'header') return req.headers?.[f.name] ?? '';
  const v = (req.body as Record<string, unknown> | undefined)?.[f.name];
  if (v === undefined) return '';
  return f.kind === 'json' ? JSON.stringify(v, null, 2) : String(v);
}

function check(f: FormField, v: string): string | null {
  if (!v) return f.required ? 'Required' : null;
  if (f.kind === 'json') { try { JSON.parse(v); } catch { return 'Not valid JSON'; } }
  if (f.kind === 'number' && Number.isNaN(Number(v))) return 'A number';
  if (f.decimal && !/^\d+(\.\d+)?$/.test(v)) return 'A decimal string, like 500.00';
  return null;
}

function value(f: FormField, v: string): unknown {
  if (!v) return null;
  if (f.kind === 'json') { try { return JSON.parse(v); } catch { return v; } }
  if (f.kind === 'number') return Number(v);
  if (f.kind === 'boolean') return v === 'true';
  return v;
}

export function TryForm({ initial, paramFields, bodyFields }: { initial: SampleInput; paramFields: FormField[]; bodyFields: FormField[] }) {
  const all = useMemo(() => [...paramFields, ...bodyFields], [paramFields, bodyFields]);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(all.map((f) => [keyOf(f), initialValue(f, initial)])));
  const [showOptional, setShowOptional] = useState(false);

  // every change rewrites the request in the panel
  useEffect(() => {
    const t = setTimeout(() => {
      const set = Object.fromEntries(all.map((f) => [keyOf(f), value(f, vals[keyOf(f)] ?? '')]));
      window.dispatchEvent(new CustomEvent(GUIDE_SET, { detail: set }));
    }, 150);
    return () => clearTimeout(t);
  }, [vals, all]);

  const problems = all.filter((f) => check(f, vals[keyOf(f)] ?? ''));

  const row = (f: FormField) => {
    const k = keyOf(f);
    const v = vals[k] ?? '';
    const set = (x: string) => setVals((s) => ({ ...s, [k]: x }));
    const id = `fld-${f.in}-${f.name}`;
    const err = check(f, v);
    return (
      <div className="param tf-row" key={k}>
        <div className="n">
          <label htmlFor={id}><code className="fname">{f.name}</code></label>
          <span className="t">{f.type || f.kind}{f.in !== 'body' && ` · ${f.in}`}{f.required && <> · <em>required</em></>}</span>
        </div>
        <div className="pd">
          {f.kind === 'enum' || f.kind === 'boolean' ? (
            <select id={id} className="tf-in" value={v} onChange={(e) => set(e.target.value)} aria-invalid={!!err}>
              <option value="">{f.required ? 'Choose one' : 'Not sent'}</option>
              {(f.kind === 'boolean' ? ['true', 'false'] : f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.kind === 'json' ? (
            <textarea id={id} className="tf-in tf-json" value={v} onChange={(e) => set(e.target.value)} spellCheck={false} aria-invalid={!!err} />
          ) : (
            <input id={id} className="tf-in" value={v} onChange={(e) => set(e.target.value)} spellCheck={false} autoComplete="off" placeholder={f.required ? '' : 'Not sent'} aria-invalid={!!err} />
          )}
          {err ? <span className="tf-err">{err}</span> : f.description && <span className="tf-hint">{f.description}</span>}
        </div>
      </div>
    );
  };

  const req = bodyFields.filter((f) => f.required);
  const opt = bodyFields.filter((f) => !f.required);
  return (
    <div className="tf">
      <div className={`tf-state ${problems.length ? 'bad' : 'ok'}`} role="status">
        {problems.length ? `${problems.length} field${problems.length > 1 ? 's' : ''} to fix: ${problems.map((p) => p.name).join(', ')}` : 'The request matches the contract.'}
      </div>
      {paramFields.length > 0 && (<><h2 className="ref-h2">Parameters</h2><div className="params">{paramFields.map(row)}</div></>)}
      {req.length > 0 && (<><h2 className="ref-h2">Body <small>required</small></h2><div className="params">{req.map(row)}</div></>)}
      {opt.length > 0 && (
        <>
          <h2 className="ref-h2">Body <small>optional, {opt.length}</small>
            <button type="button" className="linkbtn" onClick={() => setShowOptional((s) => !s)}>{showOptional ? 'Hide' : 'Show'}</button>
          </h2>
          {showOptional && <div className="params">{opt.map(row)}</div>}
        </>
      )}
    </div>
  );
}
