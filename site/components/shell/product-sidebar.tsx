'use client';

import { PRODUCTS } from '@/lib/nav';
import { Sidebar } from './sidebar';
import { useProduct } from './use-product';

/** The docs sidebar: a switch between the two products, then the chosen product's sections. */
export function ProductSidebar() {
  const [product, choose] = useProduct();
  const nav = PRODUCTS.find((p) => p.id === product) || PRODUCTS[0];
  return (
    <Sidebar
      sections={nav.sections}
      top={
        <div className="seg2 side-switch" role="group" aria-label="Product">
          {PRODUCTS.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === product} onClick={() => choose(p.id)}>{p.label}</button>
          ))}
        </div>
      }
    />
  );
}
