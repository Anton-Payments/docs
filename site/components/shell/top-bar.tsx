'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme, type ThemeMode } from './providers';
import { MenuIcon, SearchIcon } from './icons';
import { openSearch } from './search';

/*
  The header: logo, the four sections, search, the Dashboard and the theme. Nothing else.
  Page tools (the console) live on the page. Sign-in arrives with real sandbox sign-in, not before.
*/
export function TopBar() {
  const path = usePathname();
  const home = path === '/';
  const tab = path.startsWith('/reference') ? 'ref' : path.startsWith('/changelog') ? 'log' : path.startsWith('/intelligence') ? 'intel' : 'guides';
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
        <Link href="/guides/register-a-payee" aria-current={tab === 'guides' && !home ? 'page' : undefined}>Guides</Link>
        <Link href="/reference" aria-current={tab === 'ref' ? 'page' : undefined}>API reference</Link>
        <Link href="/intelligence/overview" aria-current={tab === 'intel' ? 'page' : undefined}>Intelligence</Link>
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

const NEXT: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'Match system' };

/** One button that cycles light, dark and the system setting; the icon shows the current one. */
function ThemeButton() {
  const { mode, setMode } = useTheme();
  const label = `Theme: ${LABEL[mode]}. Switch to ${LABEL[NEXT[mode]].toLowerCase()}`;
  return (
    <button className="tbtn" onClick={() => setMode(NEXT[mode])} aria-label={label} title={label}>
      {mode === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
      ) : mode === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8.5 20h7M12 16.5V20" /></svg>
      )}
    </button>
  );
}
