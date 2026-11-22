import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rewriteHref } from '@/components/mdx';

/** Descriptions in the spec are Markdown. Render them with our link rules and no raw HTML. */
export function Md({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div className="ref-desc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = '', children: c }) => {
            const h = rewriteHref(href);
            return h.startsWith('/') ? <Link href={h}>{c}</Link> : <a href={h} target="_blank" rel="noreferrer">{c}</a>;
          },
          table: (p) => (
            <div className="table-wrap">
              <table {...p} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
