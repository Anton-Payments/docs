import Link from 'next/link';

/*
  The docs footer: the www site footer (www/src/components/site-footer.tsx) with columns for the
  docs: the same band, a tagline of its own, link columns and the legal row.
*/

const WWW = 'https://www.antonpayments.com';
const EXT = { target: '_blank', rel: 'noopener noreferrer' } as const;
type FLink = { href: string; label: string; ext?: boolean };

const COLUMNS: { title: string; links: FLink[] }[] = [
  {
    title: 'Get started',
    links: [
      { href: '/quickstart', label: 'Quickstart' },
      { href: '/authentication', label: 'Authentication' },
      { href: '/environments', label: 'Environments' },
      { href: '/errors', label: 'Error handling' },
      { href: '/sandbox/overview', label: 'Sandbox' },
    ],
  },
  {
    title: 'Payouts',
    links: [
      { href: '/guides/register-a-payee', label: 'Register a payee' },
      { href: '/guides/send-a-payout', label: 'Send a payout' },
      { href: '/guides/track-payouts-with-webhooks', label: 'Webhooks' },
      { href: '/guides/handle-returns-and-failures', label: 'Returns and failures' },
      { href: '/guides/go-live', label: 'Go live' },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { href: '/intelligence/overview', label: 'Overview' },
      { href: '/intelligence/quickstart', label: 'Quickstart' },
      { href: '/intelligence/decisions', label: 'Act on a decision' },
      { href: '/intelligence/reviews', label: 'Work the review queue' },
      { href: '/intelligence/pii-and-vault', label: 'PII and the vault' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { href: '/reference', label: 'API reference' },
      { href: '/concepts/webhook-events', label: 'Webhook events' },
      { href: '/concepts/idempotency', label: 'Idempotency' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/openapi-merchant.yaml', label: 'OpenAPI file' },
    ],
  },
  {
    title: 'Anton',
    links: [
      { href: WWW, label: 'antonpayments.com', ext: true },
      { href: `${WWW}/developers`, label: 'Developer hub', ext: true },
      { href: 'https://trust.antonpayments.com', label: 'Trust center', ext: true },
      { href: `${WWW}/contact`, label: 'Contact', ext: true },
      { href: 'https://status.antonpayments.com', label: 'Status', ext: true },
    ],
  },
];

const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>;

export function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-wrap">
        <div className="sf-top">
          <div>
            <Link href="/" aria-label="Anton Docs home" className="sf-home">
              <img src="/brand/mark-white.svg" alt="" width={30} height={29} />
              <span className="sf-word">ANTON<i>.</i></span>
              <small>DOCS</small>
            </Link>
            <p className="sf-tag">
              <span className="sf-dim">You write one call.</span>
              <br />
              Anton thinks through <span className="sf-g">the rest.</span>
            </p>
          </div>
          <div className="sf-cta">
            <p>The docs are public. If something is wrong or missing, tell us and we&apos;ll fix the page.</p>
            <a href="https://github.com/anton-payments/docs/issues" {...EXT}>Open an issue on GitHub <span aria-hidden="true">↗</span><NewTab /></a>
          </div>
        </div>

        <nav className="sf-links" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.ext ? (
                      <a href={l.href} className="sf-ext" {...EXT}>{l.label}<NewTab /></a>
                    ) : (
                      <Link href={l.href}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sf-legal">
          <span>&copy; {new Date().getFullYear()} Anton Payments Inc.</span>
          <nav aria-label="Legal">
            <a href={`${WWW}/legal/privacy`} {...EXT}>Privacy</a>
            <a href={`${WWW}/legal/terms`} {...EXT}>Terms</a>
            <a href={`${WWW}/legal/cookies`} {...EXT}>Cookies</a>
            <a href={`${WWW}/legal/compliance-statement`} {...EXT}>Security</a>
          </nav>
          <div className="sf-social">
            <a href="https://linkedin.com/company/antonpayments" aria-label="Anton on LinkedIn (opens in a new tab)" {...EXT}>
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.82 0H1.18A1.17 1.17 0 000 1.15v13.7A1.17 1.17 0 001.18 16h13.64A1.17 1.17 0 0016 14.85V1.15A1.17 1.17 0 0014.82 0zM4.74 13.64H2.37V6h2.37v7.64zM3.56 4.96a1.38 1.38 0 110-2.76 1.38 1.38 0 010 2.76zm10.08 8.68h-2.37V9.92c0-.89-.02-2.03-1.24-2.03-1.22 0-1.42.97-1.42 1.97v3.78H6.23V6h2.28v1.05h.03c.32-.6 1.09-1.24 2.25-1.24 2.4 0 2.85 1.58 2.85 3.63v4.2z" /></svg>
            </a>
            <a href="https://github.com/anton-payments" aria-label="Anton on GitHub (opens in a new tab)" {...EXT}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12.02c0 4.42 2.87 8.18 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.56 9.56 0 015 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A10.02 10.02 0 0022 12.02C22 6.48 17.52 2 12 2z" /></svg>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
