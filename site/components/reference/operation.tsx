import Link from 'next/link';
import type { SampleInput } from '@/lib/samples';
import { flatten, requiresIdempotency, serverUrls, successStatus, type Operation } from '@/lib/openapi';
import { Md } from './markdown';
import { Fields, ParamTable } from './schema';

export function exampleRequest(op: Operation, body?: unknown): SampleInput {
  const pathParams: Record<string, string> = {};
  const query: Record<string, string> = {};
  const headers: Record<string, string> = {};
  for (const p of op.parameters) {
    const ex = p.example ?? p.schema?.example;
    if (p.in === 'path') pathParams[p.name] = ex !== undefined ? String(ex) : `${p.name}`;
    if (p.in === 'query' && p.required && ex !== undefined) query[p.name] = String(ex);
    if (p.in === 'header' && /idempotency-key/i.test(p.name)) headers['Idempotency-Key'] = ex !== undefined ? String(ex) : '4f9c2e1a-7b0d-4c8a-9e51-0b7e51d23c8a';
  }
  return { method: op.method, path: op.path, baseUrl: serverUrls().sandbox, pathParams, query, headers, body };
}

export function OperationHeader({ op, view }: { op: Operation; view: 'docs' | 'try' }) {
  const scopes = op.security?.flatMap((s) => Object.values(s).flat()).filter(Boolean) || [];
  return (
    <>
      <div className="ph">
        <div className="ph-text">
          <div className="crumb"><Link href="/reference">API reference</Link><span className="cur">{op.group}</span></div>
          <h1>{op.title}</h1>
        </div>
        <div className="row">
          <div className="seg2" role="tablist" aria-label="View">
            <Link href={op.href} aria-current={view === 'docs' ? 'page' : undefined}>Docs</Link>
            <Link href={`${op.href}/try`} aria-current={view === 'try' ? 'page' : undefined}>Try it</Link>
          </div>
        </div>
      </div>
      <div className="row" style={{ margin: '4px 0 16px' }}>
        <span className="endpoint"><b className={`verb ${op.method}`}>{op.method.toUpperCase()}</b>{op.path}</span>
        {requiresIdempotency(op) && <span className="pill warn">Idempotency-Key required</span>}
        {[...new Set(scopes)].map((s) => <span key={s} className="pill unknown">Scope: {s}</span>)}
      </div>
    </>
  );
}

export function OperationDocs({ op }: { op: Operation }) {
  const path = op.parameters.filter((p) => p.in === 'path');
  const query = op.parameters.filter((p) => p.in === 'query');
  const header = op.parameters.filter((p) => p.in === 'header');
  const body = flatten(op.requestBody?.content?.['application/json']?.schema);
  const formBody = op.requestBody?.content && !op.requestBody.content['application/json'] ? Object.entries(op.requestBody.content)[0] : null;
  return (
    <>
      <Md>{op.description}</Md>
      {path.length > 0 && (<><h2 className="ref-h2" id="path">Path parameters</h2><ParamTable params={path} /></>)}
      {header.length > 0 && (<><h2 className="ref-h2" id="headers">Headers</h2><ParamTable params={header} /></>)}
      {query.length > 0 && (<><h2 className="ref-h2" id="query">Query parameters</h2><ParamTable params={query} /></>)}
      {body && (<><h2 className="ref-h2" id="body">Body <small>application/json</small></h2><Fields schema={body} hideReadOnly /></>)}
      {formBody && (<><h2 className="ref-h2" id="body">Body <small>{formBody[0]}</small></h2>{formBody[1].schema ? <Fields schema={formBody[1].schema} /> : null}</>)}
      <h2 className="ref-h2" id="responses">Responses</h2>
      <div className="responses">
        {Object.entries(op.responses).map(([status, r]) => {
          const schema = flatten(r.content?.['application/json']?.schema);
          const n = Number(status);
          return (
            <details key={status} className="resp" open={status === successStatus(op)}>
              <summary>
                <span className={`sc ${n < 300 ? 'ok' : n === 409 || n === 429 ? 'warn' : 'bad'}`}>{status}</span>
                <span style={{ color: 'var(--muted)' }}>{(r.description || '').split('\n')[0].slice(0, 140)}</span>
              </summary>
              <div className="rbody">
                {r.description && r.description.includes('\n') && <Md>{r.description}</Md>}
                {schema?.properties && <Fields schema={schema} />}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
