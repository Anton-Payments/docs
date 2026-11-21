/*
  An example response that agrees with the request beside it: the spec's example, with the fields
  the reader sent copied in, and a payout's arithmetic kept true.
*/

/** The spec's example response, with the fields the reader sent copied in, so the pair agrees. */
export function echo(example: unknown, sent: unknown): unknown {
  if (!example || !sent || typeof example !== 'object' || typeof sent !== 'object' || Array.isArray(example) || Array.isArray(sent)) return example;
  const out = { ...(example as Record<string, unknown>) };
  for (const [k, v] of Object.entries(sent as Record<string, unknown>)) {
    if (!(k in out)) continue;
    const cur = out[k];
    if (v !== null && typeof v === 'object') out[k] = echo(cur, v);
    else if (cur === null || typeof cur !== 'object') out[k] = v;
  }
  return out;
}

/** Keep a payout example's arithmetic true after the echo: debited = amount + fee + buffer. */
export function totals(b: unknown): unknown {
  const o = b as Record<string, unknown>;
  if (!o || typeof o !== 'object' || typeof o.total_debited !== 'string' || typeof o.source_amount !== 'string') return b;
  const n = (v: unknown) => (typeof v === 'string' ? Number(v) : 0);
  const places = (o.source_amount.split('.')[1] || '').length;
  return { ...o, total_debited: (n(o.source_amount) + n(o.fee) + n(o.buffer_amount)).toFixed(places) };
}

export function exampleResponse(example: unknown, sent: unknown) {
  return totals(echo(example, sent));
}
