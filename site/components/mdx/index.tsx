import Link from 'next/link';
import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { BulbIcon, CheckIcon, InfoIcon, WarnIcon } from '@/components/shell/icons';
import { CodeBlock, CodeTabs } from './code';
import { RunStep } from './run-step';
import { Entry, ChangelogFilter, Notes, Diff, Endpoints, Codes } from './changelog';
import { BeforeYouBegin } from './before';
import { Decision, Choice } from './decision';
import { getOperation } from '@/lib/openapi';
import { PRODUCTS } from '@/lib/nav';

/* ---------- callouts (Mintlify names kept, so ported pages render unchanged) ---------- */
function Callout({ type, title, children }: { type: 'note' | 'info' | 'tip' | 'warning' | 'check' | 'danger'; title?: string; children: ReactNode }) {
  const Icon = type === 'warning' || type === 'danger' ? WarnIcon : type === 'tip' ? BulbIcon : type === 'check' ? CheckIcon : InfoIcon;
  return (
    <div className={`callout ${type}`} role="note">
      <span className="ci"><Icon /></span>
      <div className="cb">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
export const Note = (p: { children: ReactNode; title?: string }) => <Callout type="note" {...p} />;
export const Info = (p: { children: ReactNode; title?: string }) => <Callout type="info" {...p} />;
export const Tip = (p: { children: ReactNode; title?: string }) => <Callout type="tip" {...p} />;
export const Warning = (p: { children: ReactNode; title?: string }) => <Callout type="warning" {...p} />;
export const Danger = (p: { children: ReactNode; title?: string }) => <Callout type="danger" {...p} />;
export const Check = (p: { children: ReactNode; title?: string }) => <Callout type="check" {...p} />;

/* ---------- cards ---------- */
/**
 * A link card. A card that points at an API reference page shows that endpoint's method and path,
 * read from the spec, in place of a caption, so it can't drift from the contract. A card that points
 * at a core-path page is labelled with its step.
 */
export function Card({ title, href, kicker, children }: { title: string; href?: string; icon?: string; kicker?: string; children?: ReactNode }) {
  const ref = href?.match(/^\/reference\/([^/#?]+)\/([^/#?]+)$/);
  const op = ref ? getOperation(ref[1], ref[2]) : undefined;
  // a card pointing at a core-path page says which step it is, from the sidebar config
  const core = href ? PRODUCTS.find((p) => p.core.includes(href)) : undefined;
  const k = kicker ?? (core && `Step ${core.core.indexOf(href!) + 1} of ${core.core.length}`);
  const inner = (
    <>
      {k && <span className="card-k">{k}</span>}
      <span className="card-t">{title}</span>
      {op ? (
        <span className="card-route"><span className={`verb ${op.method}`}>{op.method.toUpperCase()}</span><code>{op.path}</code></span>
      ) : (
        children && <div className="card-b">{children}</div>
      )}
      {href && <span className="go">Open →</span>}
    </>
  );
  if (href) return <Link href={rewriteHref(href)} className="card">{inner}</Link>;
  return <div className="card">{inner}</div>;
}
export function CardGroup({ cols = 2, children }: { cols?: number; children: ReactNode }) {
  return <div className={`cards c${cols >= 3 ? 3 : 2}`}>{children}</div>;
}

/* ---------- steps ---------- */
export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ title?: string; children?: ReactNode }>[];
  return (
    <div className="steps">
      {items.map((c, i) => (
        <div className="step" key={i}>
          <span className="num">{i + 1}</span>
          <div className="sb">
            {c.props.title && <div className="st">{c.props.title}</div>}
            {c.props.children}
          </div>
        </div>
      ))}
    </div>
  );
}
export function Step({ children }: { title?: string; children: ReactNode }) {
  return <>{children}</>;
}

/* ---------- accordions ---------- */
export function Accordion({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="ab prose">{children}</div>
    </details>
  );
}
export function AccordionGroup({ children }: { children: ReactNode }) {
  return <div className="accordion-group">{children}</div>;
}

/* ---------- tabs and code groups ---------- */
export function CodeGroup({ children }: { children: ReactNode }) {
  return <CodeTabs>{children}</CodeTabs>;
}
export function Tabs({ children }: { children: ReactNode }) {
  return <CodeTabs>{children}</CodeTabs>;
}
export function Tab({ children }: { title: string; children: ReactNode }) {
  return <>{children}</>;
}

/* ---------- guide parts ---------- */


const TONE: Record<string, string> = {
  active: 'ok', completed: 'ok', approved: 'ok', verified: 'ok', delivered: 'ok', settled: 'ok', confirmed: 'ok',
  created: 'info', pending: 'info', pending_screening: 'info', processing: 'info', in_review: 'info', open: 'info', sent: 'info', submitted: 'info', validating: 'info', quoted: 'info',
  archived: 'unknown', expired: 'unknown', cancelled: 'unknown', canceled: 'unknown', draft: 'unknown',
  on_hold: 'warn', held: 'warn', review: 'warn', awaiting_information: 'warn',
  blocked: 'bad', failed: 'bad', returned: 'bad', rejected: 'bad', denied: 'bad', revoked: 'bad', cannot_be_processed: 'bad', velocity_blocked: 'bad',
};
export function StatusPill({ status, tone }: { status: string; tone?: string }) {
  return <span className={`pill ${tone || TONE[status] || 'unknown'}`}>{status}</span>;
}

/**
 * A lifecycle drawn from the spec's enum. `states` is "a, b, c"; `edges` labels the arrows between
 * consecutive states ("label | label"); prefix a label with "<>" for a two-way move.
 */
export function Lifecycle({ states, notes, edges, children }: { states: string; notes?: string; edges?: string; children?: ReactNode }) {
  const s = states.split(',').map((x) => x.trim());
  const n = (notes || '').split('|').map((x) => x.trim());
  const e = (edges || '').split('|').map((x) => x.trim());
  return (
    <div className="lifecycle">
      <div className="lc-track">
        {s.map((st, i) => (
          <div key={st} style={{ display: 'contents' }}>
            <div className="lc-node">
              <StatusPill status={st} />
              {n[i] && <small>{n[i]}</small>}
            </div>
            {i < s.length - 1 && (
              <div className={`lc-edge ${e[i]?.startsWith('<>') ? 'both' : ''}`}>
                <span>{(e[i] || '').replace(/^<>\s*/, '')}</span>
                <i />
              </div>
            )}
          </div>
        ))}
      </div>
      {children && <div className="lc-notes">{children}</div>}
    </div>
  );
}

/** What goes wrong for this job: real status and error codes from the spec, and the fix. */
export function Errors({ children }: { children: ReactNode }) {
  return <div className="errs">{children}</div>;
}
export function ErrorRow({ status, code, children }: { status: number | string; code: string; children: ReactNode }) {
  const s = Number(status);
  return (
    <div className="err">
      <span className={`sc ${s < 300 ? 'ok' : s === 409 || s === 429 ? 'warn' : 'bad'}`}>{status}</span>
      <span className="ec">{code}</span>
      <div className="ef">{children}</div>
    </div>
  );
}

export function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <span className="endpoint">
      <b className={`verb ${method.toLowerCase()}`}>{method.toUpperCase()}</b>
      {path}
    </span>
  );
}

/* ---------- links: old Mintlify paths map to the new structure ---------- */
export function rewriteHref(href: string): string {
  if (!href.startsWith('/')) return href;
  const [p, hash] = href.split('#');
  const mapped = LINK_MAP[p] ?? (p.startsWith('/api-reference/') ? p.replace('/api-reference/', '/reference/') : p.startsWith('/guides/intelligence/') ? p.replace('/guides/intelligence/', '/intelligence/') : p);
  return hash ? `${mapped}#${hash}` : mapped;
}
export const LINK_MAP: Record<string, string> = {
  '/introduction': '/',
  '/capabilities': '/concepts/capabilities',
  '/how-anton-evaluates-payouts': '/concepts/how-anton-evaluates-payouts',
  '/guides/manage-beneficiaries': '/guides/register-a-payee',
  '/guides/handle-webhooks': '/guides/track-payouts-with-webhooks',
  '/guides/fx-exchange': '/guides/pay-across-currencies',
  '/guides/crypto-payouts': '/guides/pay-out-in-stablecoin',
  '/guides/batch-payouts': '/guides/send-payouts-in-bulk',
  '/guides/going-live': '/guides/go-live',
  '/guides/verifications': '/concepts/verifications',
  '/api-reference/introduction': '/concepts/api-conventions',
  '/api-reference/errors': '/errors',
  '/api-reference/idempotency': '/concepts/idempotency',
  '/api-reference/pagination': '/concepts/pagination',
  '/api-reference/rate-limits': '/concepts/rate-limits',
  '/api-reference/webhook-events': '/concepts/webhook-events',
  '/api-reference/webhook-signing': '/concepts/webhook-signing',
  '/api-reference/ip-allowlist': '/guides/go-live',
  '/api-reference/authentication/create-access-token': '/authentication#mint-an-access-token',
};

function A({ href = '', ...rest }: ComponentProps<'a'>) {
  const h = rewriteHref(href);
  if (h.startsWith('/')) return <Link href={h} {...rest} />;
  if (h.startsWith('#')) return <a href={h} {...rest} />;
  return <a href={h} target="_blank" rel="noreferrer" {...rest} />;
}

/*
  Tables: a status value in the first column ("`completed`") is drawn as a status pill, so a
  status table reads the same as the API's own lifecycle. Any other code there becomes the row's anchor.
*/
type El = ReactElement<{ children?: ReactNode }>;
const textOf = (n: ReactNode): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : isValidElement(n) ? textOf((n as El).props.children) : '');
function pillCell(cell: ReactNode): ReactNode {
  if (!isValidElement(cell)) return cell;
  const kids = Children.toArray((cell as El).props.children);
  if (kids.length !== 1 || !isValidElement(kids[0]) || (kids[0] as El).type !== 'code') return cell;
  const v = textOf(kids[0]);
  if (TONE[v]) return cloneElement(cell as El, {}, <StatusPill status={v} />);
  // a code in the first column is a link target of its own, so `/errors#review_closed` lands on its row
  if (/^[a-z][a-z0-9_.]*$/.test(v)) return cloneElement(cell as El, { id: v } as object);
  return cell;
}
function pillify(node: ReactNode): ReactNode {
  return Children.map(node, (n) => {
    if (!isValidElement(n)) return n;
    const el = n as El;
    if (el.type === 'tr') {
      const cells = Children.toArray(el.props.children).filter(isValidElement);
      return cloneElement(el, {}, cells.map((c, i) => (i === 0 ? pillCell(c) : c)));
    }
    if (el.type === 'thead' || el.type === 'tbody') return cloneElement(el, {}, pillify(el.props.children));
    return el;
  });
}
function Table({ children, ...p }: ComponentProps<'table'>) {
  return (
    <div className="table-wrap">
      <table {...p}>{pillify(children)}</table>
    </div>
  );
}

export const mdxComponents = {
  a: A,
  pre: CodeBlock,
  table: Table,
  Note, Info, Tip, Warning, Danger, Check, Card, CardGroup, Steps, Step, Accordion, AccordionGroup, CodeGroup, Tabs, Tab,
  Decision, Choice, Lifecycle, Errors, ErrorRow, Endpoint, StatusPill, RunStep, Entry, ChangelogFilter, Notes, Diff, Endpoints, Codes, BeforeYouBegin,
};
