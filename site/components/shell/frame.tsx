'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, type SideSection } from './sidebar';
import { Dock } from '@/components/console/dock';

/** Docs pages get the sidebar; the home page is full width. */
export function Frame({ sections, children }: { sections: SideSection[]; children: ReactNode }) {
  const path = usePathname();
  if (path === '/') return <div className="home-frame">{children}</div>;
  return (
    <div className="frame">
      <Sidebar sections={sections} />
      <div className="center">
        <div className="upper">{children}</div>
        <Dock />
      </div>
    </div>
  );
}
