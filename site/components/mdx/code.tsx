'use client';

import { CopyButton } from '@/components/ui/copy-button';
import { Children, isValidElement, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';


const LANG_LABEL: Record<string, string> = { bash: 'Shell', sh: 'Shell', shell: 'Shell', json: 'JSON', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript', ts: 'TypeScript', php: 'PHP', go: 'Go', python: 'Python', http: 'HTTP', yaml: 'YAML' };

type PreProps = ComponentProps<'pre'> & { title?: string; 'data-title'?: string; bare?: boolean; icon?: string };

/** A highlighted block with a header (its title, or language) and a copy button. */
export function CodeBlock({ title, bare, icon: _icon, children, ...rest }: PreProps) {
  const ref = useRef<HTMLPreElement>(null);
  const lang = (rest as Record<string, unknown>)['data-language'] as string | undefined;
  const t = title || rest['data-title'] || (lang && lang !== 'plaintext' && lang !== 'text' ? LANG_LABEL[lang] || lang : undefined);
  const pre = (
    <pre ref={ref} {...rest}>
      {children}
    </pre>
  );
  if (bare) return pre;
  return (
    <div className="codeblock" data-pane="code" data-title={t || 'Code'}>
      <div className="codeblock-head">
        {t ? <span className="title">{t}</span> : <span className="title" />}
        <div className="r">
          <CopyButton getText={() => ref.current?.textContent || ''} />
        </div>
      </div>
      {pre}
    </div>
  );
}

/** Tabs over code blocks (Mintlify CodeGroup) or over any content (Tabs/Tab). */
export function CodeTabs({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ title?: string; 'data-title'?: string; children?: ReactNode }>[];
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const labels = items.map((c, n) => c.props.title || c.props['data-title'] || `Tab ${n + 1}`);
  const cur = items[i];
  // a tab is code when it is a highlighted block (or a Tab holding only one). Checked by shape:
  // server-rendered children reach this client component as lazy references, not CodeBlock itself.
  const looksCode = (e: ReactElement | undefined): e is ReactElement<{ children?: ReactNode }> => {
    if (!e) return false;
    const p = e.props as Record<string, unknown>;
    if ('data-language' in p || 'data-title' in p) return true;
    const k = Children.toArray(p.children as ReactNode).filter(isValidElement) as ReactElement[];
    return k.length === 1 && k[0].type === 'code';
  };
  const only = cur ? (Children.toArray(cur.props.children).filter(isValidElement) as ReactElement[]) : [];
  const codeEl = looksCode(cur) ? cur : only.length === 1 && looksCode(only[0]) ? only[0] : null;
  const isCode = !!codeEl;
  return (
    <div className="codeblock" data-pane={isCode ? 'code' : undefined} data-title={labels[i]}>
      <div className="codeblock-head" role="tablist">
        {labels.map((l, n) => (
          <button key={n} className="tab" role="tab" aria-selected={n === i} onClick={() => setI(n)}>
            {l}
          </button>
        ))}
        <div className="r">
          {right}
          <CopyButton getText={() => ref.current?.querySelector('pre')?.textContent || ''} />
        </div>
      </div>
      <div ref={ref} className={isCode ? '' : 'prose'} style={isCode ? undefined : { padding: '4px 16px 14px' }}>
        {codeEl ? <CodeBlockBare el={codeEl} /> : cur?.props.children}
      </div>
    </div>
  );
}

function CodeBlockBare({ el }: { el: ReactElement<{ children?: ReactNode }> }) {
  const { title: _t, icon: _i, ...props } = el.props as PreProps;
  return <pre {...(props as ComponentProps<'pre'>)}>{props.children}</pre>;
}
