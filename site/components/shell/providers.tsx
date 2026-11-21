'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CONSOLE_DEFAULTS, type PageKind } from '@/lib/nav';
import type { SampleInput } from '@/lib/samples';

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

/* ---------------- theme: light, dark, or follow the system ---------------- */
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

/* ---------------- console ---------------- */
export type MockResponse = { status: number; body: unknown; headers?: Record<string, string>; ms?: number };
export type ConsoleTarget =
  | {
      kind: 'request';
      title: string;
      request: SampleInput;
      response?: MockResponse;
      /** shown in the empty response pane before anything is sent */
      hint?: string;
      /** a step id, so a page can mark that step as run */
      stepId?: string;
    }
;

type ConsoleState = {
  kind: PageKind;
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  target: ConsoleTarget | null;
  setTarget: (t: ConsoleTarget | null) => void;
  /** values typed into a Try it form; the dock renders the request from these */
  setRequest: (r: SampleInput) => void;
  result: MockResponse | null;
  running: boolean;
  send: (override?: ConsoleTarget) => void;
  ranSteps: string[];
  register: (kind: PageKind) => void;
};

const ConsoleCtx = createContext<ConsoleState | null>(null);
export function useConsole() {
  const c = useContext(ConsoleCtx);
  if (!c) throw new Error('useConsole outside provider');
  return c;
}

function ConsoleProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<PageKind>('concept');
  const [choices, setChoices] = useState<Partial<Record<PageKind, boolean>>>({});
  const [target, setTargetState] = useState<ConsoleTarget | null>(null);
  const [result, setResult] = useState<MockResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [ranSteps, setRanSteps] = useState<string[]>([]);

  useEffect(() => setChoices(read('anton-docs-console', {})), []);

  const open = choices[kind] ?? CONSOLE_DEFAULTS[kind];
  const setOpen = useCallback(
    (v: boolean) =>
      setChoices((c) => {
        const next = { ...c, [kind]: v };
        write('anton-docs-console', next);
        return next;
      }),
    [kind],
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const setTarget = useCallback((t: ConsoleTarget | null) => {
    setTargetState(t);
    setResult(null);
  }, []);
  const setRequest = useCallback((r: SampleInput) => {
    setTargetState((t) => (t && t.kind === 'request' ? { ...t, request: r } : t));
  }, []);

  const send = useCallback((override?: ConsoleTarget) => {
    const t = override || target;
    if (!t || t.kind !== 'request') return;
    if (override) setTargetState(override);
    setRunning(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(t.response || { status: 200, body: { data: {} } });
      setRunning(false);
      if (t.stepId) setRanSteps((s) => (s.includes(t.stepId!) ? s : [...s, t.stepId!]));
    }, 420);
  }, [target]);

  const register = useCallback((k: PageKind) => setKind(k), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggle();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open) {
        e.preventDefault();
        send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, send, open]);

  const value = useMemo(
    () => ({ kind, open, setOpen, toggle, target, setTarget, setRequest, result, running, send, ranSteps, register }),
    [kind, open, setOpen, toggle, target, setTarget, setRequest, result, running, send, ranSteps, register],
  );
  return <ConsoleCtx.Provider value={value}>{children}</ConsoleCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
        <ConsoleProvider>{children}</ConsoleProvider>
    </ThemeProvider>
  );
}

/** Drop into any page to tell the console what kind of page this is, and what it should hold. */
export function ConsolePage({ kind, target }: { kind: PageKind; target?: ConsoleTarget | null }) {
  const { register, setTarget } = useConsole();
  useEffect(() => {
    register(kind);
  }, [kind, register]);
  useEffect(() => {
    if (target !== undefined) setTarget(target);
    // target objects are rebuilt per render on the server; key on their JSON to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(target)]);
  return null;
}
