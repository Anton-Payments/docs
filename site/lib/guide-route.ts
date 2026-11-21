/*
  Where each guide sits on its product's route, the same six stages the home page walks. A guide
  page shows the route in place of a breadcrumb, with the other guides at its stage beside it.
  Only pages that exist are listed; a stage with none yet is shown but not linked.
*/

export type RouteStage = { n: string; pages: string[] };
export type GuideRoute = { product: string; stages: RouteStage[] };

export const GUIDE_ROUTES: GuideRoute[] = [
  {
    product: 'Payouts',
    stages: [
      { n: 'Connect', pages: ['/authentication'] },
      { n: 'Register', pages: ['/guides/register-a-payee', '/guides/register-an-instrument', '/guides/import-payees', '/guides/verify-a-person-or-business'] },
      { n: 'Send', pages: ['/guides/send-a-payout', '/guides/fund-your-balance', '/guides/pay-across-currencies', '/guides/convert-currency', '/guides/pay-out-in-stablecoin', '/guides/send-payouts-in-bulk'] },
      { n: 'Evaluate', pages: ['/guides/handle-holds-and-reviews', '/guides/respond-to-an-rfi', '/guides/payouts-that-need-approval'] },
      { n: 'Deliver', pages: ['/guides/track-payouts-with-webhooks', '/guides/verify-webhook-signatures', '/guides/run-webhooks-in-production'] },
      { n: 'Outcome', pages: ['/guides/handle-returns-and-failures', '/guides/reconcile-with-transactions'] },
    ],
  },
  {
    product: 'Intelligence',
    stages: [
      { n: 'Connect', pages: ['/intelligence/quickstart'] },
      { n: 'Evaluate', pages: ['/intelligence/payee-registration', '/intelligence/instrument-screening', '/intelligence/payout-screening', '/intelligence/merchant-onboarding', '/intelligence/monitor-over-time'] },
      { n: 'Decide', pages: ['/intelligence/decisions'] },
      { n: 'Review', pages: ['/intelligence/reviews'] },
      { n: 'Resolve', pages: ['/intelligence/record-a-decision'] },
      { n: 'Record', pages: ['/intelligence/export-case-files'] },
    ],
  },
];

export function routeFor(url: string) {
  for (const r of GUIDE_ROUTES) {
    const at = r.stages.findIndex((s) => s.pages.includes(url));
    if (at >= 0) return { route: r, at };
  }
  return null;
}
