import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/*
  The link-preview card, concept B ("the route"), at 1200 by 630. Left: the lockup, one big outlined
  mark (the page's stage number, or an endpoint's method), the title and its lede. Right: a list
  that says where the page sits: its product's six stages with this one lit, the section it is
  filed in, or the endpoint's request fields. Callers in app/og and the reference fill it.
*/

export const OG_SIZE = { width: 1200, height: 630 };

const read = (p: string) => readFileSync(join(process.cwd(), p));
const font = (f: string) => read(`lib/og-fonts/${f}`);
const FONTS = [
  { name: 'Geist', data: font('geist-sans-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Geist', data: font('geist-sans-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Geist Mono', data: font('geist-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Unbounded', data: font('unbounded-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
];
const MARK = `data:image/svg+xml;base64,${read('public/brand/mark.svg').toString('base64')}`;

const INK = '#111318';
const MUTED = '#50545E';
const FAINT = '#6A6E77';
const QUIET = '#9AA0AA';
const LINE = '#E7E8EB';
const ACCENT = '#2B45FF';

export type OgRow = { label: string; state: 'done' | 'on' | 'next' | 'field'; required?: boolean; /** the row's position in its full list, when the card shows only part of it */ n?: number };
export type OgCard = { title: string; lede?: string; big?: string; heading?: string; rows?: OgRow[] };

const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 3).replace(/\s+\S*$/, '')}…` : s);

export function ogCard({ title, lede, big, heading, rows = [] }: OgCard) {
  const word = !!big && !/^\d+$/.test(big);
  const numbered = rows.some((r) => r.state !== 'field');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#FFFFFF', padding: '58px 64px', fontFamily: 'Geist', color: INK }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: rows.length ? 48 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} width={40} height={39} alt="" />
            <div style={{ display: 'flex', fontSize: 24, letterSpacing: 2, fontWeight: 600 }}>
              ANTON<span style={{ color: '#00BC7D' }}>.</span>
            </div>
            <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 15, letterSpacing: 4, color: FAINT, borderLeft: `1px solid ${LINE}`, paddingLeft: 14 }}>DOCS</div>
          </div>
          {big && (
            <div style={{ display: 'flex', marginTop: 22, fontFamily: 'Unbounded', fontWeight: 600, fontSize: word ? (big.length > 4 ? 112 : 150) : 210, lineHeight: 0.85, letterSpacing: word ? -1 : -8, color: '#FFFFFF', WebkitTextStrokeWidth: 3, WebkitTextStrokeColor: ACCENT }}>{big}</div>
          )}
          <div style={{ display: 'flex', marginTop: 'auto', fontWeight: 600, fontSize: title.length > 30 ? 50 : 58, lineHeight: 1.04, letterSpacing: -2 }}>{title}</div>
          {lede && <div style={{ display: 'flex', marginTop: 14, fontSize: 21, lineHeight: 1.45, color: MUTED }}>{clip(lede, 120)}</div>}
        </div>
        {rows.length > 0 && (
          <div style={{ width: 380, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `1px solid ${LINE}`, paddingLeft: 40 }}>
            {heading && <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 15, letterSpacing: heading.startsWith('/') ? 0 : 3, textTransform: heading.startsWith('/') ? 'none' : 'uppercase', color: FAINT, marginBottom: 18 }}>{clip(heading, 34)}</div>}
            {rows.map((r, i) =>
              r.state === 'field' ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', fontFamily: 'Geist Mono', fontSize: 19, padding: '9px 0', borderBottom: '1px solid #F0F1F4', color: '#2A2E36' }}>
                  <span style={{ display: 'flex' }}>{clip(r.label, 26)}</span>
                  {r.required && <span style={{ display: 'flex', marginLeft: 'auto', fontSize: 14, color: ACCENT }}>required</span>}
                </div>
              ) : (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '13px 18px', borderRadius: 12, fontSize: 25, background: r.state === 'on' ? ACCENT : 'transparent', color: r.state === 'on' ? '#FFFFFF' : r.state === 'done' ? '#2A2E36' : QUIET }}>
                  {numbered && <span style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 16, width: 28 }}>{String(r.n ?? i + 1).padStart(2, '0')}</span>}
                  <span style={{ display: 'flex', whiteSpace: 'nowrap' }}>{clip(r.label, 21)}</span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}

/** The stage rows for a route: the ones before `at` done, `at` lit, the rest still ahead. */
export const stageRows = (stages: string[], at: number): OgRow[] =>
  stages.map((label, i) => ({ label, state: at < 0 || i < at ? 'done' : i === at ? 'on' : 'next' }));
