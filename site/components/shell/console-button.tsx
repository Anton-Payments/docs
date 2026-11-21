'use client';

import { useConsole } from './providers';

/** The console belongs to the page: shown beside the title, and ⌘J anywhere. */
export function ConsoleButton() {
  const { open, toggle } = useConsole();
  return (
    <button className={`cbtn ${open ? 'on' : ''}`} aria-pressed={open} onClick={toggle} title="Show or hide the console (⌘J)">
      <span className="cdot" aria-hidden="true" />
      Console
      <kbd>⌘J</kbd>
    </button>
  );
}
