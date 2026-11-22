'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/*
  The one decision a reader makes before writing code, as side-by-side choices. A choice that
  carries `set` is live: picking it rewrites those fields in the request on the right, so the
  reader sees exactly what the decision changes.
*/

const Ctx = createContext<{ picked: string | null; pick: (t: string) => void } | null>(null);

export const GUIDE_SET = 'guide:set';

export function Decision({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Ctx.Provider value={{ picked, pick: setPicked }}>
      <div className="decision">{children}</div>
    </Ctx.Provider>
  );
}

export function Choice({ title, value, fields, picked, set, children }: {
  title: string;
  value?: string;
  fields?: string;
  picked?: boolean;
  set?: Record<string, unknown>;
  children?: ReactNode;
}) {
  const ctx = useContext(Ctx);
  const on = ctx?.picked ? ctx.picked === title : !!picked;
  const live = !!set && !!ctx;
  const choose = () => {
    if (!live || on) return;
    ctx!.pick(title);
    window.dispatchEvent(new CustomEvent(GUIDE_SET, { detail: set }));
  };
  const Tag = live ? 'button' : 'div';
  return (
    <Tag
      className={`choice ${on ? 'picked' : ''} ${live ? 'setter' : ''}`}
      {...(live ? { type: 'button' as const, onClick: choose, 'aria-pressed': on } : {})}
    >
      <header>
        <b>{title}</b>
        {value && <span className="mono">{value}</span>}
      </header>
      {children && <div className="cdesc">{children}</div>}
      {fields && (
        <div className="fields">
          {fields.split(',').map((f) => (
            <span key={f}>{f.trim()}</span>
          ))}
        </div>
      )}
    </Tag>
  );
}
