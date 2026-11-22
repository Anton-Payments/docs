import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/*
  The link-preview card for every page: the Anton lockup, where the page sits (its product and
  stage, or its section), its title and lede, and, for a page on a route, the route line with the
  stage it sits at. White, hairlines, one accent: the design system, at 1200 by 630.
*/

export const OG_SIZE = { width: 1200, height: 630 };

const mark = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), 'public/brand/mark.svg')).toString('base64')}`;

export function ogCard({ eyebrow, title, lede, route, endpoint }: { eyebrow: string; title: string; lede?: string; route?: { stages: string[]; at: number }; endpoint?: { method: string; path: string } }) {
  const ink = '#111318';
  const muted = '#50545E';
  const faint = '#6A6E77';
  const line = '#E7E8EB';
  const accent = '#2B45FF';
  const short = lede && lede.length > 150 ? `${lede.slice(0, 147).replace(/\s+\S*$/, '')}…` : lede;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', padding: '64px 72px', fontFamily: 'Geist' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={40} height={38} alt="" />
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 2, color: ink }}>
            ANTON<span style={{ color: '#00BC7D' }}>.</span>
          </div>
          <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, color: faint, borderLeft: `1px solid ${line}`, paddingLeft: 14, marginLeft: 2 }}>DOCS</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: accent }}>{eyebrow}</div>
          <div style={{ display: 'flex', fontSize: title.length > 34 ? 64 : 80, lineHeight: 1.04, letterSpacing: -1.5, color: ink, marginTop: 18, maxWidth: 1000 }}>{title}</div>
          {short && <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.4, color: muted, marginTop: 22, maxWidth: 960 }}>{short}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
          {route ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: 1056 }}>
              <div style={{ display: 'flex', width: 1056 }}>
                {route.stages.map((st, i) => (
                  <div key={st} style={{ display: 'flex', width: 1056 / route.stages.length, fontSize: 18, color: i === route.at ? ink : faint }}>{st}</div>
                ))}
              </div>
              <div style={{ display: 'flex', width: 1056, height: 3, background: line, marginTop: 12 }}>
                <div style={{ display: 'flex', width: (1056 * (route.at + 1)) / route.stages.length, height: 3, background: accent }} />
              </div>
            </div>
          ) : endpoint ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${line}`, paddingTop: 24 }}>
              <div style={{ display: 'flex', fontSize: 18, letterSpacing: 2, color: accent, border: `1px solid ${line}`, borderRadius: 8, padding: '6px 12px' }}>{endpoint.method}</div>
              <div style={{ display: 'flex', fontSize: 24, color: ink }}>{endpoint.path}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: 1, background: line }} />
          )}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
