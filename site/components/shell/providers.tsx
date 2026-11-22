'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/* ---------------- storage helpers (every read/write can fail: private mode, blocked storage) ---------------- */
function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
}

/* ---------------- theme: light or dark. Until the reader picks one, it follows their system setting ---------------- */
type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';
type ThemeState = { theme: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void; toggle: () => void };
const ThemeCtx = createContext<ThemeState>({ theme: 'light', mode: 'system', setMode: () => {}, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const saved = read<string>('anton-docs-theme', 'system');
    setModeState(saved === 'light' || saved === 'dark' ? saved : 'system');
    setTheme((document.documentElement.dataset.theme as Theme) || 'light');
  }, []);
  const apply = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    setTheme(t);
  }, []);
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    write('anton-docs-theme', m);
    apply(m === 'system' ? systemTheme() : m);
  }, [apply]);
  // while following the system, follow it live
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [mode, apply]);
  const toggle = useCallback(() => setMode(theme === 'dark' ? 'light' : 'dark'), [theme, setMode]);
  return <ThemeCtx.Provider value={{ theme, mode, setMode, toggle }}>{children}</ThemeCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>{children}</ThemeProvider>
  );
}
