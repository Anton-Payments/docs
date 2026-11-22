'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Docs pages get the sidebar; the home page is full width. */
export function Frame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const path = usePathname();
  if (path === '/') return <div className="home-frame">{children}</div>;
  return (
    <div className="frame">
      {sidebar}
      <div className="center">
        <div className="upper">{children}</div>
      </div>
    </div>
  );
}
