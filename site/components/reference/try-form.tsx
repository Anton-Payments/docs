'use client';

import { useEffect, useState } from 'react';
import { useConsole, useSession } from '@/components/shell/providers';
import type { SampleInput } from '@/lib/samples';
import { PREVIEW_ACCOUNT } from '@/lib/mock';

export type FormField = { name: string; in: 'path' | 'query' | 'header' | 'body'; required: boolean; kind: 'string' | 'number' | 'boolean' | 'enum' | 'json'; options?: string[]; description?: string };

function initialValue(f: FormField, req: SampleInput): string {
  if (f.in === 'path') return req.pathParams?.[f.name] ?? '';
  if (f.in === 'query') return req.query?.[f.name] ?? '';
  if (f.in === 'header') return req.headers?.[f.name] ?? '';
  const v = (req.body as Record<string, unknown> | undefined)?.[f.name];
  if (v === undefined) return '';
  return f.kind === 'json' ? JSON.stringify(v, null, 2) : String(v);
}

export function TryForm({ initial, paramFields, bodyFields }: { initial: SampleInput; paramFields: FormField[]; bodyFields: FormField[] }) {
  const { setRequest, setOpen, open, send, running } = useConsole();
  const { signedIn } = useSession();
  const all = [...paramFields, ...bodyFields];
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(all.map((f) => [f.in + ':' + f.name, initialValue(f, initial)])));
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    const pathParams: Record<string, string> = {};
    const query: Record<string, string> = {};
    const headers: Record<string, string> = {};
    const body: Record<string, unknown> = {};
    for (const f of all) {
      const v = vals[f.in + ':' + f.name];
      if (v === '' || v === undefined) continue;
      if (f.in === 'path') pathParams[f.name] = v;
      else if (f.in === 'query') query[f.name] = v;
      else if (f.in === 'header') headers[f.name] = v;
      else if (f.kind === 'json') { try { body[f.name] = JSON.parse(v); } catch { body[f.name] = v; } }
      else if (f.kind === 'number') body[f.name] = Number(v);
      else if (f.kind === 'boolean') body[f.name] = v === 'true';
      else body[f.name] = v;
    }
    setRequest({ ...initial, pathParams, query, headers, body: bodyFields.length ? body : initial.body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  const field = (f: FormField) => {
    const key = f.in + ':' + f.name;
    const v = vals[key] ?? '';
    const set = (x: string) => setVals((s) => ({ ...s, [key]: x }));
    const id = `fld-${f.in}-${f.name}`;
    return (
      <div className="fld" key={key} style={f.kind === 'json' ? { gridColumn: '1 / -1' } : undefined}>
        <label htmlFor={id}>
          {f.name} {f.required && <em>*</em>}
          <small>{f.in === 'body' ? '' : f.in}</small>
        </label>
        {f.kind === 'enum' ? (
          <select id={id} value={v} onChange={(e) => set(e.target.value)}>
            <option value="">—</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.kind === 'boolean' ? (
          <select id={id} value={v} onChange={(e) => set(e.target.value)}>
            <option value="">—</option><option value="true">true</option><option value="false">false</option>
          </select>
        ) : f.kind === 'json' ? (
          <textarea id={id} value={v} onChange={(e) => set(e.target.value)} spellCheck={false} />
        ) : (
          <input id={id} value={v} onChange={(e) => set(e.target.value)} spellCheck={false} autoComplete="off" />
        )}
        {f.description && <span style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: '15px' }}>{f.description}</span>}
      </div>
    );
  };

  const req = bodyFields.filter((f) => f.required);
  const opt = bodyFields.filter((f) => !f.required);
  return (
    <div>
      <div className="callout info" style={{ marginTop: 0 }}>
        <div className="cb">
          {signedIn
            ? <>Values come from the spec&apos;s example. When sign-in is connected, they&apos;ll come from your sandbox ({PREVIEW_ACCOUNT.name}), and Send will sign the request in your browser.</>
            : <>You&apos;re signed out, so the form shows the spec&apos;s example values. Sign in to send requests to your sandbox.</>}
        </div>
      </div>
      {paramFields.length > 0 && (<><div className="form-sec">Parameters</div><div className="form">{paramFields.map(field)}</div></>)}
      {req.length > 0 && (<><div className="form-sec">Required</div><div className="form">{req.map(field)}</div></>)}
      {opt.length > 0 && (
        <>
          <div className="form-sec" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            Optional ({opt.length})
            <button className="linkbtn" onClick={() => setShowOptional((s) => !s)}>{showOptional ? 'Hide' : 'Show'}</button>
          </div>
          {showOptional && <div className="form">{opt.map(field)}</div>}
        </>
      )}
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn pri" onClick={() => { setOpen(true); send(); }} disabled={running}>{running ? 'Sending…' : 'Send to sandbox'}</button>
        {!open && <button className="btn" onClick={() => setOpen(true)}>Show console</button>}
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sandbox only. Production keys can&apos;t be used here.</span>
      </div>
    </div>
  );
}
