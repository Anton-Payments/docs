import { handle } from '@/lib/mcp';

/*
  The MCP endpoint. Readers connect to https://<docs>/mcp; proxy.ts sends MCP traffic on that path
  here and lets a browser through to the /mcp page. Stateless: no sessions, nothing stored.
*/

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization',
};

function origin(req: Request) {
  const host = req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: CORS });
  }
  const o = origin(req);
  const msgs = Array.isArray(body) ? body : [body];
  const out = msgs.map((m) => handle(m, o)).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}

// no server-initiated stream: this server never pushes
export function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, Allow: 'POST' } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { ...CORS, Allow: 'POST' } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
