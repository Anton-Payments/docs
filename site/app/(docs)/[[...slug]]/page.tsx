import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { mdxComponents } from '@/components/mdx';
import { pageExtras } from '@/components/mdx/pages';
import { Toc } from '@/components/shell/toc';
import { ConsolePage } from '@/components/shell/providers';
import { GuidePane } from '@/components/guide/pane';
import { ReportLink } from '@/components/shell/report-link';
import { RouteBar } from '@/components/guide/route-bar';
import { routeFor } from '@/lib/guide-route';
import { Home, type HrefMap } from '@/components/home/home';
import { ROUTES } from '@/lib/home-route';
import { CORE_PATH, DOCS_NAV } from '@/lib/nav';
import { findOperation } from '@/lib/openapi';
import { formatDate, latestEntries } from '@/lib/changelog';

type Props = { params: Promise<{ slug?: string[] }> };

function sectionFor(url: string) {
  return DOCS_NAV.find((s) => s.items.some((i) => i.href === url))?.title;
}

/** What a guide's code pane can show, read from the page source: its runnable steps and code blocks. */
type PaneEndpoint = { method: string; path: string; href?: string };
function paneInfo(path: string) {
  let raw = '';
  try {
    raw = readFileSync(join(process.cwd(), 'content/docs', path), 'utf8');
  } catch {
    return { hasCode: false, endpoints: [] as PaneEndpoint[] };
  }
  const hasCode = /<RunStep\b/.test(raw) || /^\s*```[a-z]/m.test(raw);
  const seen = new Set<string>();
  const endpoints: PaneEndpoint[] = [];
  const add = (method: string, p: string, href?: string) => {
    const k = `${method} ${p}`;
    if (seen.has(k) || endpoints.length >= 6) return;
    seen.add(k);
    endpoints.push({ method: method.toUpperCase(), path: p, href });
  };
  for (const m of raw.matchAll(/<RunStep[^>]*?method="(\w+)"\s+path="([^"]+)"/g)) add(m[1], m[2], findOperation(m[1], m[2])?.href);
  for (const m of raw.matchAll(/\[`(GET|POST|PATCH|PUT|DELETE) (\/v1\/[^`]+)`\]\((\/reference\/[^)]+)\)/g)) add(m[1], m[2], m[3]);
  return { hasCode, endpoints };
}


/** Where each endpoint and "read more" title on the home route links to, resolved from the spec. */
const MORE: Record<string, string> = {
  Authentication: '/authentication',
  'Register an instrument': '/guides/register-an-instrument',
  'Send a payout': '/guides/send-a-payout',
  'Handle holds and reviews': '/guides/handle-holds-and-reviews',
  'Track payouts with webhooks': '/guides/track-payouts-with-webhooks',
  'Handle returns and failures': '/guides/handle-returns-and-failures',
  'Intelligence quickstart': '/intelligence/quickstart',
  'Screen a payee': '/intelligence/payee-registration',
  'Act on a decision': '/intelligence/decisions',
  'Work the review queue': '/intelligence/reviews',
  'Record and approve a decision': '/intelligence/record-a-decision',
  'Export case files and evidence': '/intelligence/export-case-files',
};
function homeHrefs(): HrefMap {
  const ops: Record<string, string> = {};
  for (const r of Object.values(ROUTES)) {
    for (const st of r.stages) {
      for (const row of st.f[0]) {
        const [m, path] = row as [string, string];
        const op = findOperation(m, path);
        if (op?.href) ops[`${m.toUpperCase()} ${path}`] = op.href;
      }
    }
  }
  return { ops, more: MORE };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const d = page.data;
  const Body = d.body;
  const url = page.url;

  if (d.kind === 'home') {
    const entries = latestEntries(3).map((e) => ({ ...e, when: formatDate(e.date) }));
    return (
      <>
        <ConsolePage kind="home" target={null} />
        <main id="content"><Home entries={entries} hrefs={homeHrefs()} /></main>
      </>
    );
  }

  const section = d.section || sectionFor(url);
  const coreIdx = CORE_PATH.indexOf(url);
  const next = coreIdx >= 0 && coreIdx < CORE_PATH.length - 1 ? source.getPage(CORE_PATH[coreIdx + 1].slice(1).split('/')) : null;
  const crumbs = [section, ...(d.kicker ? d.kicker.split('·').map((s: string) => s.trim()) : [])].filter(Boolean) as string[];
  const pane = d.kind === 'guide' || d.kind === 'webhooks' ? paneInfo(page.path) : { hasCode: false, endpoints: [] };
  const twoPane = pane.hasCode;

  return (
    <>
      <ConsolePage kind={d.kind} target={null} />
      <main className={`main ${twoPane ? 'g2' : ''}`} id="content">
        {routeFor(url) && <RouteBar url={url} />}
        <div className={`main-inner ${d.kind === 'changelog' ? 'cl-page' : ''}`}>
          <div className="ph">
            <div className="ph-text">
              <div className="ph-top">
                {routeFor(url) ? null : (
                  <div className="crumb">
                    {crumbs.map((c, i) => (
                      <span key={i} className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <h1>{d.title}</h1>
            </div>
            {pageExtras(d.kind)}
          </div>
          {d.description && <p className="lede">{d.description}</p>}
          <article className="prose">
            <Body components={mdxComponents} />
          </article>
          <ReportLink path={url} title={d.title} />
          {next && (
            <Link href={next.url} className="nextcard">
              <span><small>Next in the core path</small><b>{next.data.title}</b></span>
              <i aria-hidden="true">→</i>
            </Link>
          )}
        </div>
      </main>
      {twoPane ? (
        <GuidePane />
      ) : d.kind === 'changelog' ? null : (
        <Toc items={d.toc.map((t) => ({ title: t.title, url: t.url, depth: t.depth }))}>
          {next && (
            <Link href={next.url} className="next">
              <span>Next in the core path</span>
              <strong>{next.data.title} →</strong>
            </Link>
          )}
        </Toc>
      )}
    </>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const title = page.data.kind === 'home' ? 'Anton Docs' : page.data.title;
  return {
    title: page.data.kind === 'home' ? { absolute: title } : title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: { title, description: page.data.description, url: page.url },
  };
}
