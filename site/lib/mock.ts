/*
  Preview data. Everything here stands in for a signed-in reader's sandbox until sign-in and the
  console are wired to the API. It is obviously synthetic and labelled as preview wherever it shows.
*/
export const PREVIEW_ACCOUNT = {
  name: 'Acme Sandbox',
  initials: 'AS',
  clientId: 'ant_oc_test_7Qk2••••',
  webhookUrl: 'https://example.com/hooks/anton',
  tokenExpiresIn: '6 h 12 min',
};

export const PREVIEW_REQUESTS = [
  { method: 'post', status: 201, path: '/v1/payouts', note: 'PO-8821', ago: '4 min ago' },
  { method: 'post', status: 409, path: '/v1/payouts', note: 'idempotency conflict', ago: '6 min ago' },
  { method: 'post', status: 201, path: '/v1/beneficiaries', note: '', ago: '12 min ago' },
  { method: 'post', status: 422, path: '/v1/payouts', note: 'destination_amount must be a string', ago: '15 min ago' },
];

const ev = (id: string, type: string, created: string, object: Record<string, unknown>) => ({
  id, object: 'event', type, api_version: '2026-12-01', livemode: false, created_at: created, data: { object },
});

/** Shaped like the documented event envelope (see /concepts/webhook-events). Values are synthetic. */
export const PREVIEW_DELIVERIES = [
  { t: '14:02:11', event: 'payout.on_hold', status: 200, ms: '84 ms', payload: ev('evt_01JD3XC9', 'payout.on_hold', '2026-11-21T14:02:11.204Z', { id: 'pay_01HX8Z9K0M2N3P4Q5R6S7T8UAB', object: 'payout', livemode: false, status: 'on_hold' }) },
  { t: '14:02:09', event: 'payout.created', status: 200, ms: '91 ms', payload: ev('evt_01JD3XC8', 'payout.created', '2026-11-21T14:02:09.871Z', { id: 'pay_01HX8Z9K0M2N3P4Q5R6S7T8UAB', object: 'payout', livemode: false, status: 'created' }) },
  { t: '13:58:40', event: 'payout.completed', status: 200, ms: '77 ms', payload: ev('evt_01JD3XC4', 'payout.completed', '2026-11-21T13:58:40.104Z', { id: 'pay_01HX8Z9K0M2N3P4Q5R6S7T8UA9', object: 'payout', livemode: false, status: 'completed' }) },
  { t: '13:58:12', event: 'beneficiary.created', status: 500, ms: '2.1 s', payload: ev('evt_01JD3XC2', 'beneficiary.created', '2026-11-21T13:58:12.330Z', { id: 'ben_01HX8Z9K0M2N3P4Q5R6S7T8UA1', object: 'beneficiary', livemode: false, status: 'active' }) },
  { t: '13:58:12', event: 'beneficiary.created', status: 200, ms: '102 ms', payload: ev('evt_01JD3XC2', 'beneficiary.created', '2026-11-21T13:58:12.330Z', { id: 'ben_01HX8Z9K0M2N3P4Q5R6S7T8UA1', object: 'beneficiary', livemode: false, status: 'active' }) },
];
