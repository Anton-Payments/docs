import type { ReactNode } from 'react';
import { Frame } from '@/components/shell/frame';
import { DOCS_NAV } from '@/lib/nav';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <Frame sections={DOCS_NAV}>{children}</Frame>;
}
