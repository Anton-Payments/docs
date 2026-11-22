import Link from 'next/link';
import { loadSpec } from '@/lib/openapi';
import { ConsolePage } from '@/components/shell/providers';

export const metadata = { title: 'API reference' };

/** The path every endpoint in a group shares, so a group reads as the resource it is. */
function prefix(paths: string[]) {
  const parts = paths.map((p) => p.split('/'));
  const out: string[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const seg = parts[0][i];
    if (seg.startsWith('{') || !parts.every((p) => p[i] === seg)) break;
    out.push(seg);
  }
  return out.length > 2 ? out.join("/") : "";
}

export default function ReferenceIndex() {
  const { groups, spec } = loadSpec();
  const version = spec.info?.version;
  return (
    <>
      <ConsolePage kind="reference" target={null} />
      <main className="main" id="content">
        <div className="main-inner wide">
          <div className="ph"><div className="ph-text"><div className="crumb">API reference{version ? ` · version ${version}` : ''}</div><h1>API reference</h1></div>
            <div className="row"><a className="btn sm" href="/openapi-merchant.yaml" download>Download OpenAPI</a></div>
          </div>
          <p className="lede">Built from the same OpenAPI file the API is checked against. Generate a client from it and you are coding against the exact contract.</p>
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="endpoint"><b>Sandbox</b>https://api.antonpayments.dev</span>
            <span className="endpoint"><b>Production</b>https://api.antonpayments.com</span>
          </div>
          <div className="ref-index2">
            {groups.map((g) => (
              <section className="rx" key={g.slug}>
                <header>
                  <h3>{g.title}</h3>
                  {prefix(g.ops.map((o) => o.path)) && <code>{prefix(g.ops.map((o) => o.path))}</code>}
                </header>
                <ul>
                  {g.ops.map((o) => (
                    <li key={o.href}>
                      <Link href={o.href}>
                        <span className={`verb ${o.method}`}>{o.method.toUpperCase()}</span>
                        <b>{o.title}</b>
                        <code>{o.path}</code>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
