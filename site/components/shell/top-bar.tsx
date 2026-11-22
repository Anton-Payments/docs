'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useTheme } from './providers';
import { MenuIcon, SearchIcon } from './icons';
import { openSearch } from './search';
import { useProduct } from './use-product';

/*
  The header: logo, the four sections, search, the Dashboard and the theme. Nothing else.
  Page tools (the code panel) live on the page. Sign-in arrives with real sandbox sign-in, not before.
*/
export function TopBar() {
  const path = usePathname();
  const home = path === '/';
  // the phone drawer closes on any navigation, and on a tap anywhere outside it
  useEffect(() => { document.querySelector('.side')?.classList.remove('open'); }, [path]);
  useEffect(() => {
    const away = (e: MouseEvent) => {
      const side = document.querySelector('.side');
      const t = e.target as HTMLElement;
      if (side?.classList.contains('open') && !side.contains(t) && !t.closest('.menu-btn')) side.classList.remove('open');
    };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  }, []);
  const [product] = useProduct();
  const tab = path.startsWith('/reference') ? 'ref' : path.startsWith('/changelog') ? 'log' : product === 'intelligence' ? 'intel' : 'guides';
  return (
    <header className={`top ${home ? 'home' : ''}`}>
      {!home && (
        <button className="tbtn menu-btn" aria-label="Open navigation" onClick={() => document.querySelector('.side')?.classList.toggle('open')}>
          <MenuIcon />
        </button>
      )}
      <Link href="/" className="lock" aria-label="Anton Docs home">
        <img className="mark" src="/brand/mark.svg" alt="" width={24} height={23} />
        <span className="word">Anton<span className="dot">.</span></span>
        <small>Docs</small>
      </Link>
      <nav className="navtabs" aria-label="Sections">
        <Link href="/quickstart" aria-current={tab === 'guides' && !home ? 'page' : undefined}>Payouts</Link>
        <Link href="/intelligence/overview" aria-current={tab === 'intel' && !home ? 'page' : undefined}>Intelligence</Link>
        <Link href="/reference" aria-current={tab === 'ref' ? 'page' : undefined}>API reference</Link>
        <Link href="/changelog" aria-current={tab === 'log' ? 'page' : undefined}>Changelog</Link>
      </nav>
      <div className="spacer" />
      <button className="search-btn" onClick={openSearch} aria-label="Search the docs">
        <SearchIcon />
        <span>Search the docs</span>
        <kbd>⌘K</kbd>
      </button>
      <a className="dash-link" href="https://app.antonpayments.com" target="_blank" rel="noreferrer">Dashboard<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      <ThemeButton />
    </header>
  );
}

/**
 * Light or dark. A first visit follows the reader's system setting; a click picks the other one and
 * is remembered. The icon is the theme a click switches to.
 */
function ThemeButton() {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light' : 'Switch to dark';
  return (
    <button className="tbtn" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
      )}
    </button>
  );
}
