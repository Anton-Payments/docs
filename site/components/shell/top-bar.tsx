'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, useTheme, type ThemeMode } from './providers';
import { MenuIcon, SearchIcon } from './icons';
import { openSearch } from './search';
import { PREVIEW_ACCOUNT } from '@/lib/mock';

/*
  The ink header: logo, the four sections, search and the account. Nothing else.
  Page tools (the console) live on the page; theme and Dashboard live in the account menu.
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
      <Account />
    </header>
  );
}

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

function Account() {
  const { signedIn, toggle } = useSession();
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="acct" ref={ref}>
      <button className={`acct-btn ${signedIn ? 'in' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {signedIn ? (
          <><span className="avatar">{PREVIEW_ACCOUNT.initials}</span><span className="nm">{PREVIEW_ACCOUNT.name}</span></>
        ) : (
          <span className="nm">Sign in</span>
        )}
        <svg className="chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          {signedIn ? (
            <div className="am-who">
              <span className="avatar">{PREVIEW_ACCOUNT.initials}</span>
              <div><b>{PREVIEW_ACCOUNT.name}</b><small>{PREVIEW_ACCOUNT.clientId}</small></div>
            </div>
          ) : (
            <div className="am-who out">
              <div><b>Sign in to fill the examples</b><small>Your IDs in every sample, and the console sends to your sandbox.</small></div>
            </div>
          )}
          <a className="am-item" role="menuitem" href="https://app.antonpayments.com" target="_blank" rel="noreferrer">Dashboard <span aria-hidden="true">↗</span></a>
          <div className="am-theme">
            <span>Theme</span>
            <div className="seg2" role="group" aria-label="Theme">
              {MODES.map((m) => (
                <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="am-foot">
            <button className="am-item" role="menuitem" onClick={() => { toggle(); setOpen(false); }}>
              {signedIn ? 'Sign out' : 'Sign in'}
            </button>
            <span className="am-note">Preview: sign-in isn&apos;t connected yet</span>
          </div>
        </div>
      )}
    </div>
  );
}
