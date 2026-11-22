'use client';

import { useState, type ReactNode } from 'react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'added', label: 'Added' },
  { id: 'changed', label: 'Changed' },
  { id: 'removed', label: 'Removed' },
];

/** The entries on their date rail, filtered by kind of change. */
export function ChangelogLog({ children }: { children: ReactNode }) {
  const [show, setShow] = useState('all');
  return (
    <>
      <div className="seg2 cl-filter" role="group" aria-label="Show">
        {FILTERS.map((f) => <button key={f.id} type="button" aria-pressed={show === f.id} onClick={() => setShow(f.id)}>{f.label}</button>)}
      </div>
      <div className="log" data-show={show}>{children}</div>
    </>
  );
}
