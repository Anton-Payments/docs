'use client';

import { useEffect, useState } from 'react';
import { GUIDE_SET } from '@/components/mdx/decision';
import { TRY_RESET } from './try-mode';

/**
 * The spec's alternative request examples, as a switch. Picking one rewrites the request in the
 * code panel: every key the others carry and this one doesn't is removed.
 */
export function ExampleSwitch({ variants }: { variants: { label: string; set: Record<string, unknown> }[] }) {
  const [on, setOn] = useState(0);
  useEffect(() => {
    const reset = () => setOn(0);
    window.addEventListener(TRY_RESET, reset);
    return () => window.removeEventListener(TRY_RESET, reset);
  }, []);
  if (variants.length < 2) return null;
  return (
    <div className="seg2 ref-ex" role="group" aria-label="Request example">
      <span className="seg-l">Example</span>
      {variants.map((v, i) => (
        <button
          key={v.label}
          type="button"
          aria-pressed={on === i}
          onClick={() => {
            setOn(i);
            window.dispatchEvent(new CustomEvent(GUIDE_SET, { detail: v.set }));
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
