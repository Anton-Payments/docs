'use client';

import { useState } from 'react';
import { copyText } from '@/components/ui/copy-button';

/**
 * The page header's Markdown control: copies the page as Markdown for pasting into an AI tool,
 * and links to the same text at /md/<path>.
 */
export function CopyMarkdown({ markdown, href }: { markdown: string; href: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (await copyText(markdown)) {
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    }
  };
  return (
    <div className="copy-md">
      <button type="button" className="btn sm" onClick={copy} aria-live="polite">
        {done ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>
        )}
        {done ? 'Copied' : 'Copy Markdown'}
      </button>
      <a className="btn sm" href={href} target="_blank" rel="noreferrer" title="This page as plain Markdown">
        .md<span className="sr-only"> (opens the Markdown in a new tab)</span>
      </a>
    </div>
  );
}
