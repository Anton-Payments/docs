import Link from 'next/link';
import { Children, isValidElement, type ReactNode } from 'react';
import { findOperation } from '@/lib/openapi';
import { ChangelogLog } from './changelog-log';

/*
  The changelog reads like a journal: a date rail, and entries that show the change itself.
  An entry is a title, one or two sentences on what changed for you, a visual built from the
  real change (a before and after, endpoint cards, error codes or a status flow), what to do if
  anything, and the full notes folded underneath.
*/

const TAG_TONE: Record<string, string> = { Added: 'ok', Changed: 'warn', Removed: 'bad', Fixed: 'info', Deprecated: 'warn', Versioning: 'accent' };

/** The list, with a filter by kind of change. */
export function ChangelogFilter({ children }: { children: ReactNode }) {
  return <ChangelogLog>{children}</ChangelogLog>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Entry({ date, title, tags, lede, action, feature, children }: {
  date: string;
  title: string;
  tags?: string;
  /** one or two sentences: what changed for you */
  lede?: string;
  /** what you need to do, if anything */
  action?: string;
  /** a release worth more room */
  feature?: boolean;
  children?: ReactNode;
}) {
  const id = `${date}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const tagList = (tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const [y, m, d] = date.split('-');
  // the visual first, then what to do, then the full notes folded at the end
  const all = Children.toArray(children);
  const notes = all.filter((c) => isValidElement(c) && c.type === Notes);
  const shown = all.filter((c) => !(isValidElement(c) && c.type === Notes));
  return (
    <section className={`entry ${feature ? 'feature' : ''}`} id={id} data-tags={tagList.join(' ').toLowerCase()}>
      <div className="date">
        {date ? (
          <time dateTime={date}><b>{MONTHS[Number(m) - 1]} {Number(d)}</b><span>{y}</span></time>
        ) : (
          <time><b>Earlier</b></time>
        )}
      </div>
      <div className="e-body">
        {tagList.length > 0 && (
          <div className="e-tags">{tagList.map((t) => <span key={t} className={`pill ${TAG_TONE[t] || 'unknown'}`}>{t}</span>)}</div>
        )}
        <h2><a href={`#${id}`}>{title}</a></h2>
        {lede && <p className="e-lede">{lede}</p>}
        {shown}
        {action && (
          <div className="e-action"><b>What you do</b><span>{action}</span></div>
        )}
        {notes}
      </div>
    </section>
  );
}

/** The full release notes, folded under the entry. */
export function Notes({ children }: { children: ReactNode }) {
  return (
    <details className="e-notes">
      <summary>Full notes</summary>
      <div className="prose">{children}</div>
    </details>
  );
}

/** A before and after: lines starting with "-" are gone, "+" are new, anything else is context. */
export function Diff({ caption, lines }: { caption?: string; lines: string[] }) {
  return (
    <figure className="e-vis e-diff">
      {caption && <figcaption>{caption}</figcaption>}
      <pre>
        {lines.map((l, i) => {
          const k = l.startsWith('- ') ? 'del' : l.startsWith('+ ') ? 'add' : 'ctx';
          return <span key={i} className={k}><i aria-hidden="true">{k === 'del' ? '−' : k === 'add' ? '+' : ' '}</i>{k === 'ctx' ? l.replace(/^ {0,2}/, '') : l.slice(2)}{'\n'}</span>;
        })}
      </pre>
    </figure>
  );
}

/** Endpoints this release added or opened up, each linking to its reference page. */
export function Endpoints({ caption, items }: { caption?: string; items: [string, string, string?][] }) {
  return (
    <figure className="e-vis e-eps">
      {caption && <figcaption>{caption}</figcaption>}
      <div>
        {items.map(([method, path, note]) => {
          const href = findOperation(method.toLowerCase(), path)?.href;
          const inner = (
            <>
              <span className="e-ep"><b className={`verb ${method.toLowerCase()}`}>{method}</b><code>{path}</code></span>
              {note && <span className="e-note">{note}</span>}
            </>
          );
          return href ? <Link key={method + path} href={href} className="e-card">{inner}</Link> : <div key={method + path} className="e-card">{inner}</div>;
        })}
      </div>
    </figure>
  );
}

/** Error codes this release introduced or changed, each linking to its row in the catalog. */
export function Codes({ caption, items }: { caption?: string; items: [string, string, string?][] }) {
  return (
    <figure className="e-vis e-codes">
      {caption && <figcaption>{caption}</figcaption>}
      <div>
        {items.map(([status, code, note]) => (
          <Link key={code} href={`/errors#${code}`} className="e-card">
            <span className="e-ep"><span className={`sc ${status.startsWith('5') ? 'bad' : status === '409' || status === '429' ? 'warn' : 'bad'}`}>{status}</span><code>{code}</code></span>
            {note && <span className="e-note">{note}</span>}
          </Link>
        ))}
      </div>
    </figure>
  );
}
