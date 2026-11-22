'use client';

import { useState } from 'react';

/** Copy text to the clipboard; false when the browser refuses. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * The one copy button: an icon that turns into a tick once the text is on the clipboard. Pass the
 * text, or a function that reads it at click time (for code that changes after render).
 */
export function CopyButton({ text, getText, label = 'Copy' }: { text?: string; getText?: () => string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (await copyText(getText ? getText() : text || '')) {
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    }
  };
  return (
    <button type="button" className={`copy ${done ? 'done' : ''}`} onClick={copy} aria-label={done ? 'Copied' : label} title={done ? 'Copied' : label}>
      {done ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>
      )}
    </button>
  );
}
