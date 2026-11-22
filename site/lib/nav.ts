/*
  The sidebar, as one template filled once per product. Each product has the same shape:
  get started, a numbered core path, the rest of its guides grouped by the stages of its route
  (the same stages as the route strip), then the pages that explain how things work.

  A page can sit in both products (authentication, errors, the webhook pages). On such a page the
  sidebar keeps the product the reader came from. Two pages can share a title, one per product
  (each product has its own Quickstart).
*/
/** `stage`: the route stage a page sits at, when the section it's filed under isn't named after one */
export type NavItem = { title: string; href: string; stage?: string };
export type NavSection = { title: string; items: NavItem[]; collapsed?: boolean; numbered?: boolean };
export type ProductId = 'payouts' | 'intelligence';
export type ProductNav = { id: ProductId; label: string; home: string; core: string[]; stages: string[]; sections: NavSection[] };

const shared = {
  authentication: { title: 'Authentication', href: '/authentication' },
  environments: { title: 'Environments', href: '/environments' },
  errors: { title: 'Error handling', href: '/errors' },
  ai: { title: 'Use the docs from AI', href: '/mcp' },
  verifySigs: { title: 'Verify webhook signatures', href: '/guides/verify-webhook-signatures' },
  webhooksProd: { title: 'Run webhooks in production', href: '/guides/run-webhooks-in-production' },
  webhookEvents: { title: 'Webhook events', href: '/concepts/webhook-events' },
  capabilities: { title: 'Capabilities', href: '/concepts/capabilities' },
};

const payoutsCore: NavItem[] = [
  { title: 'Register a payee', href: '/guides/register-a-payee', stage: 'Register' },
  { title: 'Register an instrument', href: '/guides/register-an-instrument', stage: 'Register' },
  { title: 'Fund your balance', href: '/guides/fund-your-balance', stage: 'Send' },
  { title: 'Send a payout', href: '/guides/send-a-payout', stage: 'Send' },
  { title: 'Track payouts with webhooks', href: '/guides/track-payouts-with-webhooks', stage: 'Deliver' },
];

const intelligenceCore: NavItem[] = [
  { title: 'Screen a payee', href: '/intelligence/payee-registration', stage: 'Evaluate' },
  { title: 'Act on a decision', href: '/intelligence/decisions', stage: 'Decide' },
  { title: 'Work the review queue', href: '/intelligence/reviews', stage: 'Review' },
  { title: 'Record and approve a decision', href: '/intelligence/record-a-decision', stage: 'Resolve' },
];

export const PRODUCTS: ProductNav[] = [
  {
    id: 'payouts',
    label: 'Payouts',
    home: '/quickstart',
    core: payoutsCore.map((i) => i.href),
    stages: ['Connect', 'Register', 'Send', 'Evaluate', 'Deliver', 'Outcome'],
    sections: [
      { title: 'Get started', items: [{ title: 'Introduction', href: '/' }, { title: 'Quickstart', href: '/quickstart' }, { ...shared.authentication, stage: 'Connect' }, shared.environments, { title: 'The sandbox', href: '/sandbox/overview' }, shared.errors, shared.ai] },
      { title: 'Core path', numbered: true, items: payoutsCore },
      { title: 'Register', items: [{ title: 'Import payees from a file', href: '/guides/import-payees' }, { title: 'Verify a person or business', href: '/guides/verify-a-person-or-business' }] },
      { title: 'Send', items: [{ title: 'Pay across currencies', href: '/guides/pay-across-currencies' }, { title: 'Convert currency', href: '/guides/convert-currency' }, { title: 'Pay out in stablecoin', href: '/guides/pay-out-in-stablecoin' }, { title: 'Send payouts in bulk', href: '/guides/send-payouts-in-bulk' }] },
      { title: 'Evaluate', items: [{ title: 'Handle holds and reviews', href: '/guides/handle-holds-and-reviews' }, { title: 'Respond to an RFI', href: '/guides/respond-to-an-rfi' }, { title: 'Payouts that need approval', href: '/guides/payouts-that-need-approval' }] },
      { title: 'Deliver', items: [shared.verifySigs, shared.webhooksProd] },
      { title: 'Outcome', items: [{ title: 'Handle returns and failures', href: '/guides/handle-returns-and-failures' }, { title: 'Reconcile with transactions', href: '/guides/reconcile-with-transactions' }] },
      { title: 'Launch', items: [{ title: 'Go live', href: '/guides/go-live' }] },
      {
        title: 'How it works',
        collapsed: true,
        items: [
          { title: 'API conventions', href: '/concepts/api-conventions' },
          { title: 'How Anton evaluates payouts', href: '/concepts/how-anton-evaluates-payouts' },
          shared.capabilities,
          { title: 'Identity verification', href: '/concepts/verifications' },
          { title: 'Idempotency', href: '/concepts/idempotency' },
          { title: 'Pagination', href: '/concepts/pagination' },
          { title: 'Rate limits', href: '/concepts/rate-limits' },
          shared.webhookEvents,
          { title: 'Webhook signing', href: '/concepts/webhook-signing' },
          { title: 'Sandbox test data', href: '/sandbox/test-data' },
        ],
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    home: '/intelligence/overview',
    core: intelligenceCore.map((i) => i.href),
    stages: ['Connect', 'Evaluate', 'Decide', 'Review', 'Resolve', 'Record'],
    sections: [
      { title: 'Get started', items: [{ title: 'Overview', href: '/intelligence/overview' }, { title: 'Quickstart', href: '/intelligence/quickstart', stage: 'Connect' }, shared.authentication, shared.environments, shared.errors, shared.ai] },
      { title: 'Core path', numbered: true, items: intelligenceCore },
      { title: 'Evaluate', items: [{ title: 'Screen an account or wallet', href: '/intelligence/instrument-screening' }, { title: 'Screen a payout', href: '/intelligence/payout-screening' }, { title: 'Onboard a merchant', href: '/intelligence/merchant-onboarding' }, { title: 'Monitor over time', href: '/intelligence/monitor-over-time' }] },
      { title: 'Record', items: [{ title: 'Export case files and evidence', href: '/intelligence/export-case-files' }] },
      { title: 'Webhooks', items: [shared.verifySigs, shared.webhooksProd, shared.webhookEvents] },
      {
        title: 'How it works',
        collapsed: true,
        items: [
          { title: 'PII and the vault', href: '/intelligence/pii-and-vault' },
          { title: 'Idempotency and retries', href: '/intelligence/idempotency-retries' },
          { title: 'Rate limits and errors', href: '/intelligence/rate-limits-errors' },
          shared.capabilities,
        ],
      },
    ],
  },
];

const hrefs = (p: ProductNav) => p.sections.flatMap((s) => s.items.map((i) => i.href));

/** The products a page belongs to: one, both, or none (reference and changelog pages). */
export function productsOf(path: string): ProductId[] {
  return PRODUCTS.filter((p) => hrefs(p).includes(path)).map((p) => p.id);
}

/** The next page on the core path that holds this page, if it is on one. */
export function nextOnCorePath(path: string): string | null {
  for (const p of PRODUCTS) {
    const i = p.core.indexOf(path);
    if (i >= 0 && i < p.core.length - 1) return p.core[i + 1];
  }
  return null;
}

/** The section a page is filed under, for its breadcrumb. */
export function sectionOf(path: string): string | undefined {
  for (const p of PRODUCTS) for (const s of p.sections) if (s.items.some((i) => i.href === path)) return s.title;
  return undefined;
}
