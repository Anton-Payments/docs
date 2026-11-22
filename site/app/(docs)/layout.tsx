import type { ReactNode } from 'react';
import { Frame } from '@/components/shell/frame';
import { ProductSidebar } from '@/components/shell/product-sidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <Frame sidebar={<ProductSidebar />}>{children}</Frame>;
}
