'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LANGS, highlightCode, sample, type Lang, type MockResponse, type SampleInput } from '@/lib/samples';

export function RunStepClient({ title, request, response, stepId, reference, children }: {
  title: string;
  request: SampleInput;
  response?: MockResponse;
  stepId?: string;
  reference?: string;
  children?: ReactNode;
}) {
  const [lang, setLang] = useState<Lang>('curl');
  const code = sample(lang, request);
  return (
    <div className="runstep" data-pane="run" data-title={title} data-req={JSON.stringify(request)} data-resp={response ? JSON.stringify(response) : undefined} data-step={stepId}>
      <span className="rs-link" aria-hidden="true"><i /></span>
      <header>
        <span className="rs-ep"><b className={`verb ${request.method.toLowerCase()}`}>{request.method.toUpperCase()}</b>{request.path}</span>
        <b className="rs-t">{title}</b>
        {children && <div className="rs-d">{children}</div>}
        <div className="rs-actions">
          {reference && <Link href={reference} className="btn sm">Reference</Link>}
        </div>
      </header>
      <div className="rb">
        <div className="codeblock">
          <div className="codeblock-head" role="tablist">
            {LANGS.map((l) => (
              <button key={l.id} className="tab" role="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
            <div className="r"><span className="tested pending" title="The snippet runner isn't connected to the sandbox yet">Not yet tested in sandbox</span></div>
          </div>
          <pre dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} style={{ color: 'var(--code-fg)' }} />
        </div>
      </div>
    </div>
  );
}
