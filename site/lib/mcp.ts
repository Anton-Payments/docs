import 'server-only';
import { loadSpec, findOperation } from '@/lib/openapi';
import { endpointMarkdown, markdownFor } from '@/lib/page-markdown';
import { search as searchIndex, snippet } from '@/lib/search-index';

/*
  The docs MCP server: read-only, public, stateless. It speaks MCP's Streamable HTTP transport in
  its simplest form (one JSON-RPC request in, one JSON response out), which every MCP client
  supports. Four tools: search the docs, read a page, list endpoints, read one endpoint.
*/

export const SERVER_INFO = { name: 'anton-docs', title: 'Anton Docs', version: '1.0.0' };
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

type Json = Record<string, unknown>;
type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Json };

const TOOLS = [
  {
    name: 'search_docs',
    title: 'Search the Anton docs',
    description: 'Full-text search across every Anton guide and concept page, every API endpoint, every error code and every request field. Returns titles, URLs and the matching passage. Use read_page or get_endpoint for the full text.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, e.g. "fixed_side", "webhook signature", "422 amount_precision_invalid".' }, limit: { type: 'number', description: 'At most this many results (default 8, max 20).' } },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'read_page',
    title: 'Read a docs page',
    description: 'The full text of one docs page as Markdown, with its request examples. Pass the path from search results, e.g. "/guides/send-a-payout".',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'The page path, e.g. "/guides/send-a-payout" or "/quickstart".' } }, required: ['path'] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_endpoints',
    title: 'List API endpoints',
    description: 'Every endpoint in the Anton API, grouped by resource, as method, path and title. Optionally filter by a group name such as "Payouts".',
    inputSchema: { type: 'object', properties: { group: { type: 'string', description: 'Only this group, e.g. "Payouts", "Beneficiaries", "Intelligence".' } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_endpoint',
    title: 'Read an API endpoint',
    description: 'One endpoint from the OpenAPI contract: parameters, every request body field with its type and rules, example request and response, and the errors it returns. Write requests against this, not from memory.',
    inputSchema: {
      type: 'object',
      properties: { method: { type: 'string', description: 'HTTP method, e.g. "POST".' }, path: { type: 'string', description: 'The path template, e.g. "/v1/payouts" or "/v1/payouts/{id}".' } },
      required: ['method', 'path'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

function search(query: string, limit: number, origin: string) {
  return searchIndex(query).slice(0, limit).map((h) => ({
    title: h.group === 'Guides' && h.sub && h.url.includes('#') ? `${h.sub} › ${h.title}` : h.method ? `${h.method.toUpperCase()} ${h.sub} · ${h.title}` : h.group === 'Errors' ? `${h.status} ${h.title} (error)` : h.group === 'Fields' ? `${h.title} (field, ${h.sub})` : h.title,
    url: origin + h.url,
    text: snippet(h.text, query, 320),
  }));
}

const text = (t: string, isError = false) => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });

function callTool(name: string, args: Json, origin: string) {
  if (name === 'search_docs') {
    const q = String(args.query || '');
    const limit = Math.min(20, Math.max(1, Number(args.limit) || 8));
    const r = search(q, limit, origin);
    if (!r.length) return text(`Nothing in the Anton docs matches "${q}". Try a field name, an error code or an endpoint path.`);
    return text(r.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.text}`).join('\n\n'));
  }
  if (name === 'read_page') {
    const p = markdownFor(String(args.path || ''), origin);
    if (!p) return text(`No page at "${args.path}". Use search_docs to find the path.`, true);
    return text(p.markdown + `\n\nSource: ${origin}${p.url}`);
  }
  if (name === 'list_endpoints') {
    const g = String(args.group || '').toLowerCase();
    const groups = loadSpec().groups.filter((x) => !g || x.title.toLowerCase().includes(g));
    if (!groups.length) return text(`No endpoint group matches "${args.group}".`, true);
    return text(groups.map((x) => `## ${x.title}\n` + x.ops.map((o) => `- \`${o.method.toUpperCase()} ${o.path}\` ${o.title}`).join('\n')).join('\n\n'));
  }
  if (name === 'get_endpoint') {
    const op = findOperation(String(args.method || '').toLowerCase(), String(args.path || ''));
    if (!op) return text(`No endpoint ${String(args.method).toUpperCase()} ${args.path}. Use list_endpoints for the exact path template.`, true);
    return text(endpointMarkdown(op, origin));
  }
  return null;
}

/** One JSON-RPC message in; the response, or null for a notification. */
export function handle(msg: Rpc, origin: string): Json | null {
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(-32600, 'Invalid request');
  const isNotification = msg.id === undefined || msg.id === null;
  switch (msg.method) {
    case 'initialize': {
      const asked = String(msg.params?.protocolVersion || '');
      return reply({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Search and read the Anton Payments developer docs and API contract. Prefer get_endpoint over memory when writing a request: fields, rules and errors come from the live OpenAPI file. Anton has two products: cross-border payouts, and the intelligence layer that screens payees, accounts and payouts.',
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const r = callTool(String(msg.params?.name || ''), (msg.params?.arguments as Json) || {}, origin);
      return r ? reply(r) : fail(-32602, `Unknown tool: ${msg.params?.name}`);
    }
    case 'resources/list':
      return reply({ resources: [] });
    case 'prompts/list':
      return reply({ prompts: [] });
    default:
      return isNotification ? null : fail(-32601, `Method not found: ${msg.method}`);
  }
}
