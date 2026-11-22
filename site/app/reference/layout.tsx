import type { ReactNode } from 'react';
import { Frame } from '@/components/shell/frame';
import { Sidebar, type SideSection } from '@/components/shell/sidebar';
import { loadSpec } from '@/lib/openapi';

export default function ReferenceLayout({ children }: { children: ReactNode }) {
  const { groups } = loadSpec();
  const sections: SideSection[] = [
    { title: 'API reference', items: [{ title: 'Overview', href: '/reference' }, { title: 'API conventions', href: '/concepts/api-conventions' }, { title: 'Error handling', href: '/errors' }, { title: 'Idempotency', href: '/concepts/idempotency' }, { title: 'Pagination', href: '/concepts/pagination' }] },
    ...groups.map((g) => ({ title: g.title, items: g.ops.map((o) => ({ title: o.title, href: o.href, method: o.method })) })),
  ];
  return <Frame sidebar={<Sidebar sections={sections} />}>{children}</Frame>;
}
