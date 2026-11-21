'use client';

import { CopyButton, copyText } from '@/components/ui/copy-button';
import { useMemo, useState } from 'react';
import { useConsole } from '@/components/shell/providers';
import { LANGS, highlightCode, highlightJson, sample, type Lang } from '@/lib/samples';
import { CloseIcon } from '@/components/shell/icons';

function statusClass(s: number) {
  return s < 300 ? 'ok' : s < 500 && s !== 422 && s !== 404 && s !== 403 && s !== 401 ? 'warn' : 'bad';
}


export function Dock() {
  const c = useConsole();
  const [lang, setLang] = useState<Lang>('curl');

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

  // the documented example response for this request: the console is not connected to a sandbox
  const r = c.result || t.response || null;
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
          <button className="btn sm" onClick={() => copyText(sample('curl', t.request))}>Copy as cURL</button>
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
            <span className="tab" aria-selected="true">Example response</span>
            <div className="r">
              {r && <span className={`sc ${statusClass(r.status)}`}>{r.status}</span>}
            </div>
          </div>
          {r ? (
            <pre dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(r.body, null, 2)) }} />
          ) : (
            <div className="empty"><b>No documented response</b><span>The reference page for this endpoint lists what it returns.</span></div>
          )}
        </div>
      </div>
    </section>
  );
}
