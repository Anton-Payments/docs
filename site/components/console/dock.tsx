'use client';

import { CopyButton, copyText } from '@/components/ui/copy-button';
import { useMemo, useState } from 'react';
import { useConsole, useSession } from '@/components/shell/providers';
import { LANGS, highlightCode, highlightJson, sample, type Lang } from '@/lib/samples';
import { PREVIEW_ACCOUNT, PREVIEW_DELIVERIES } from '@/lib/mock';
import { CloseIcon } from '@/components/shell/icons';

function statusClass(s: number) {
  return s < 300 ? 'ok' : s < 500 && s !== 422 && s !== 404 && s !== 403 && s !== 401 ? 'warn' : 'bad';
}


export function Dock() {
  const c = useConsole();
  const { signedIn } = useSession();
  const [lang, setLang] = useState<Lang>('curl');
  const [respTab, setRespTab] = useState<'body' | 'headers'>('body');
  const [selDelivery, setSelDelivery] = useState(0);

  const code = useMemo(() => (c.target?.kind === 'request' ? sample(lang, c.target.request) : ''), [c.target, lang]);
  if (!c.open) return null;

  const t = c.target;
  const close = (
    <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => c.setOpen(false)} aria-label="Hide the console">
      <CloseIcon />
    </button>
  );

  if (!t) {
    return (
      <section className="dock" aria-label="Console">
        <div className="dock-h"><b>Console</b><div className="r">{close}</div></div>
        <div className="panes" style={{ gridTemplateColumns: '1fr' }}>
          <div className="pane"><div className="empty"><b>Nothing to call on this page</b><span>Open an endpoint in the API reference, or a guide step, and it loads here.</span></div></div>
        </div>
      </section>
    );
  }

  if (t.kind === 'stream') {
    const d = PREVIEW_DELIVERIES[selDelivery];
    return (
      <section className="dock" aria-label="Event stream">
        <div className="dock-h">
          <b>Event stream</b>
          <span className="path">{signedIn ? PREVIEW_ACCOUNT.webhookUrl : 'Sign in to see deliveries to your endpoint'}</span>
          <div className="r">
            <span className="mock-tag">PREVIEW DATA</span>
            {signedIn && <span className="live">Live</span>}
            {close}
          </div>
        </div>
        {signedIn ? (
          <div className="panes">
            <div className="pane">
              <div className="stream" role="listbox" aria-label="Deliveries">
                {PREVIEW_DELIVERIES.map((x, i) => (
                  <button key={i} className="del" role="option" aria-selected={i === selDelivery} onClick={() => setSelDelivery(i)}>
                    <span className="t">{x.t}</span>
                    <span className="mono">{x.event}</span>
                    <span className={`sc ${x.status < 300 ? 'ok' : 'bad'}`}>{x.status}</span>
                    <span className="ms">{x.ms}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="pane">
              <div className="pane-h">
                <span className="tab" aria-selected="true">Payload</span>
                <div className="r"><span className={`sc ${d.status < 300 ? 'ok' : 'bad'}`}>{d.status}</span><span>{d.status < 300 ? 'Delivered' : 'Your endpoint failed. Retried.'}</span></div>
              </div>
              <pre dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(d.payload, null, 2)) }} />
            </div>
          </div>
        ) : (
          <div className="panes" style={{ gridTemplateColumns: '1fr' }}>
            <div className="pane"><div className="empty"><b>Signed out</b><span>When you&apos;re signed in, deliveries to your webhook endpoint stream here as they happen.</span></div></div>
          </div>
        )}
      </section>
    );
  }

  const r = c.result;
  const m = t.request.method.toUpperCase();
  return (
    <section className="dock" aria-label="Console">
      <div className="dock-h">
        <b>Console</b>
        <span className="path">
          <span className={`verb ${t.request.method.toLowerCase()}`}>{m}</span>
          {t.request.path}
        </span>
        <div className="r">
          <span className="tested pending" title="The console isn't connected to the sandbox yet">{signedIn ? `Will sign for ${PREVIEW_ACCOUNT.name}` : 'Sign in to send'}</span>
          <button className="btn sm" onClick={() => copyText(sample('curl', t.request))}>Copy as cURL</button>
          <button className="btn sm pri" onClick={() => c.send()} disabled={c.running}>
            {c.running ? 'Sending…' : r ? 'Send again' : 'Send'} <kbd>⌘↵</kbd>
          </button>
          {close}
        </div>
      </div>
      <div className="panes">
        <div className="pane">
          <div className="pane-h" role="tablist">
            {LANGS.map((l) => (
              <button key={l.id} className="tab" role="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
            <div className="r"><CopyButton text={code} /></div>
          </div>
          <pre dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
        </div>
        <div className="pane">
          <div className="pane-h" role="tablist">
            <button className="tab" role="tab" aria-selected={respTab === 'body'} onClick={() => setRespTab('body')}>Response</button>
            <button className="tab" role="tab" aria-selected={respTab === 'headers'} onClick={() => setRespTab('headers')}>Headers</button>
            <div className="r">
              {r && (
                <>
                  <span className={`sc ${statusClass(r.status)}`}>{r.status}</span>
                  <span>{r.ms ?? 312} ms</span>
                  <span className="mock-tag" title="The console isn't connected to the sandbox yet. This is the example response from the API spec.">MOCK</span>
                </>
              )}
            </div>
          </div>
          {r ? (
            respTab === 'body' ? (
              <pre dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(r.body, null, 2)) }} />
            ) : (
              <pre>{Object.entries({ 'Content-Type': 'application/json', 'Request-Id': 'req_01JD3EXAMPLE', ...(r.headers || {}) }).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
            )
          ) : (
            <div className="empty">
              <b>{c.running ? 'Sending…' : 'Not sent yet'}</b>
              <span>{t.hint || 'Send runs this request against your sandbox. No real money moves.'}</span>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>Preview: the console returns the example response from the spec until it&apos;s connected.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
