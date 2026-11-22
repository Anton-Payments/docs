'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { productsOf, type ProductId } from '@/lib/nav';

const KEY = 'anton-docs-product';
const EVENT = 'anton-docs:product';

const stored = (): ProductId => {
  try { return localStorage.getItem(KEY) === 'intelligence' ? 'intelligence' : 'payouts'; } catch { return 'payouts'; }
};

/**
 * Which product the reader is in. A page that belongs to one product decides it, and is
 * remembered; a page in both (or neither) keeps the product the reader came from.
 */
export function useProduct(): [ProductId, (p: ProductId) => void] {
  const path = usePathname();
  const own = productsOf(path);
  const [product, setProduct] = useState<ProductId>(own.length === 1 ? own[0] : 'payouts');

  useEffect(() => {
    const mine = productsOf(path);
    if (mine.length === 1) {
      setProduct(mine[0]);
      try { localStorage.setItem(KEY, mine[0]); } catch { /* storage refused */ }
    } else setProduct(stored());
    const on = () => setProduct(stored());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [path]);

  const choose = useCallback((p: ProductId) => {
    try { localStorage.setItem(KEY, p); } catch { /* storage refused */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [product, choose];
}
