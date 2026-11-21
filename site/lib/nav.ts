/*
  The guides-side sidebar. Order is deliberate: get started, the core path (payee, instrument,
  payout), then the jobs that come after it, then concepts and the deeper sections.
*/
export type NavItem = { title: string; href: string };
export type NavSection = { title: string; items: NavItem[]; collapsed?: boolean; /** leading items that are a real sequence, drawn numbered */ steps?: number };

export const DOCS_NAV: NavSection[] = [
  {
    title: 'Get started',
    items: [
      { title: 'Introduction', href: '/' },
      { title: 'Quickstart', href: '/quickstart' },
      { title: 'Authentication', href: '/authentication' },
      { title: 'Environments', href: '/environments' },
      { title: 'Error handling', href: '/errors' },
      { title: 'Use the docs from AI', href: '/mcp' },
    ],
  },
  {
    title: 'Guides',
    steps: 3,
    items: [
      { title: 'Register a payee', href: '/guides/register-a-payee' },
      { title: 'Register an instrument', href: '/guides/register-an-instrument' },
      { title: 'Send a payout', href: '/guides/send-a-payout' },
      { title: 'Import payees from a file', href: '/guides/import-payees' },
      { title: 'Verify a person or business', href: '/guides/verify-a-person-or-business' },
      { title: 'Fund your balance', href: '/guides/fund-your-balance' },
      { title: 'Pay across currencies', href: '/guides/pay-across-currencies' },
      { title: 'Convert currency', href: '/guides/convert-currency' },
      { title: 'Pay out in stablecoin', href: '/guides/pay-out-in-stablecoin' },
      { title: 'Send payouts in bulk', href: '/guides/send-payouts-in-bulk' },
      { title: 'Handle holds and reviews', href: '/guides/handle-holds-and-reviews' },
      { title: 'Respond to an RFI', href: '/guides/respond-to-an-rfi' },
      { title: 'Payouts that need approval', href: '/guides/payouts-that-need-approval' },
      { title: 'Track payouts with webhooks', href: '/guides/track-payouts-with-webhooks' },
      { title: 'Verify webhook signatures', href: '/guides/verify-webhook-signatures' },
      { title: 'Run webhooks in production', href: '/guides/run-webhooks-in-production' },
      { title: 'Handle returns and failures', href: '/guides/handle-returns-and-failures' },
      { title: 'Reconcile with transactions', href: '/guides/reconcile-with-transactions' },
      { title: 'Go live', href: '/guides/go-live' },
    ],
  },
  {
    title: 'Concepts',
    items: [
      { title: 'API conventions', href: '/concepts/api-conventions' },
      { title: 'How Anton evaluates payouts', href: '/concepts/how-anton-evaluates-payouts' },
      { title: 'Capabilities', href: '/concepts/capabilities' },
      { title: 'Identity verification', href: '/concepts/verifications' },
      { title: 'Idempotency', href: '/concepts/idempotency' },
      { title: 'Pagination', href: '/concepts/pagination' },
      { title: 'Rate limits', href: '/concepts/rate-limits' },
      { title: 'Webhook events', href: '/concepts/webhook-events' },
      { title: 'Webhook signing', href: '/concepts/webhook-signing' },
    ],
  },
  {
    title: 'Anton Intelligence',
    collapsed: true,
    items: [
      { title: 'Overview', href: '/intelligence/overview' },
      { title: 'Quickstart', href: '/intelligence/quickstart' },
      { title: 'Screen a payee', href: '/intelligence/payee-registration' },
      { title: 'Screen an account or wallet', href: '/intelligence/instrument-screening' },
      { title: 'Screen a payout', href: '/intelligence/payout-screening' },
      { title: 'Onboard a merchant', href: '/intelligence/merchant-onboarding' },
      { title: 'Monitor over time', href: '/intelligence/monitor-over-time' },
      { title: 'Act on a decision', href: '/intelligence/decisions' },
      { title: 'Work the review queue', href: '/intelligence/reviews' },
      { title: 'Record and approve a decision', href: '/intelligence/record-a-decision' },
      { title: 'Export case files and evidence', href: '/intelligence/export-case-files' },
      { title: 'PII and the vault', href: '/intelligence/pii-and-vault' },
      { title: 'Idempotency and retries', href: '/intelligence/idempotency-retries' },
      { title: 'Rate limits and errors', href: '/intelligence/rate-limits-errors' },
    ],
  },
  {
    title: 'Sandbox',
    items: [
      { title: 'Sandbox overview', href: '/sandbox/overview' },
      { title: 'Test data', href: '/sandbox/test-data' },
    ],
  },
];

/** The core path, for "next guide" links. */
export const CORE_PATH = ['/guides/register-a-payee', '/guides/register-an-instrument', '/guides/send-a-payout', '/guides/track-payouts-with-webhooks'];

/** Console defaults by page kind. The reader's choice overrides these, remembered per kind. */
export type PageKind = 'home' | 'quickstart' | 'guide' | 'concept' | 'reference' | 'try' | 'webhooks' | 'changelog';
export const CONSOLE_DEFAULTS: Record<PageKind, boolean> = {
  home: false,
  quickstart: false,
  guide: false,
  concept: false,
  reference: false,
  try: true,
  webhooks: true,
  changelog: false,
};
