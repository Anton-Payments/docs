import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { source } from '@/lib/source';
import { bodyContent, flatten, getOperation, requestExample, requiresIdempotency, responseExample, successStatus, type Operation, type Schema } from '@/lib/openapi';

/*
  The docs as plain Markdown, for AI tools: every page and every endpoint, with the site's
  components turned back into text an agent can read. Served by the MCP server, /llms.txt and
  /md/<path>.
*/

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|\\{([^}]*)\\})`));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
};

/** A JSX object literal from a `body={{ ... }}` prop, balanced on braces. */
function objectProp(src: string, name: string) {
  const at = src.indexOf(`${name}={{`);
  if (at < 0) return '';
  let i = at + name.length + 2;
  const start = i;
  let depth = 1;
  for (; i < src.length && depth; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
  }
  return src.slice(start, i - 1).trim();
}

export function mdxToMarkdown(body: string): string {
  let s = body;
  // runnable steps: the endpoint, the request body and the note under it
  s = s.replace(/<RunStep([\s\S]*?)>([\s\S]*?)<\/RunStep>/g, (_, props: string, inner: string) => {
    const head = `**${attr(props, 'title')}**: \`${attr(props, 'method').toUpperCase()} ${attr(props, 'path')}\``;
    const b = objectProp(props, 'body');
    const h = objectProp(props, 'headers');
    return [head, h && `Headers: \`{ ${h.replace(/\s+/g, ' ')} }\``, b && '```js\n{\n  ' + b + '\n}\n```', inner.trim()].filter(Boolean).join('\n\n');
  });
  s = s.replace(/<BeforeYouBegin\s+items=\{\[([\s\S]*?)\]\}\s*\/>/g, (_, items: string) => {
    const list = [...items.matchAll(/"([^"]*)"/g)].map((m) => `- ${m[1]}`).join('\n');
    return `Before you begin:\n\n${list}`;
  });
  s = s.replace(/<Choice([^>]*)>([\s\S]*?)<\/Choice>/g, (_, props: string, inner: string) => {
    const v = attr(props, 'value');
    return `- **${attr(props, 'title')}**${v ? ` (\`${v}\`)` : ''}${/\bpicked\b/.test(props) ? ', the default' : ''}: ${inner.trim().replace(/\s*\n\s*/g, ' ')}`;
  });
  s = s.replace(/<ErrorRow([^>]*)>([\s\S]*?)<\/ErrorRow>/g, (_, props: string, inner: string) => `- \`${attr(props, 'status')} ${attr(props, 'code')}\`: ${inner.trim()}`);
  s = s.replace(/<Lifecycle([^>]*)>([\s\S]*?)<\/Lifecycle>/g, (_, props: string, inner: string) => {
    const states = attr(props, 'states').split(',').map((x) => `\`${x.trim()}\``).join(' → ');
    return `Statuses: ${states}\n\n${inner.trim()}`;
  });
  s = s.replace(/<Step([^>]*)>/g, (_, props: string) => `**${attr(props, 'title')}**\n\n`);
  s = s.replace(/<Card([^>]*)>([\s\S]*?)<\/Card>/g, (_, props: string, inner: string) => `- [${attr(props, 'title')}](${attr(props, 'href')}): ${inner.trim()}`);
  s = s.replace(/<(Note|Warning|Tip|Info|Check|Danger)>([\s\S]*?)<\/\1>/g, (_, _t, inner: string) => inner.trim().split('\n').map((l) => `> ${l.trim()}`).join('\n'));
  // every other component wrapper goes; its children stay
  s = s.replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

export type PageDoc = { title: string; url: string; description: string; markdown: string };

let pages: PageDoc[] | null = null;
export function allPages(): PageDoc[] {
  if (pages && process.env.NODE_ENV === 'production') return pages;
  pages = [];
  for (const p of source.getPages()) {
    let raw = '';
    try { raw = readFileSync(join(process.cwd(), 'content/docs', p.path), 'utf8'); } catch { continue; }
    const { content } = matter(raw);
    const d = p.data;
    const head = `# ${d.title}\n\n${d.description ? `> ${d.description}\n\n` : ''}`;
    pages.push({ title: d.title, url: p.url, description: d.description || '', markdown: head + mdxToMarkdown(content) });
  }
  return pages;
}

/** A URL or path as bare segments: no origin, no leading /md/, no slashes at either end. */
function cleanPath(url: string) {
  let s = url.replace(/^https?:\/\/[^/]+/, '');
  // a loop, not /^\/+|\/+$/: that regex is quadratic on a long run of slashes
  let a = 0;
  let b = s.length;
  while (a < b && s[a] === '/') a++;
  while (b > a && s[b - 1] === '/') b--;
  s = s.slice(a, b);
  return s.startsWith('md/') ? s.slice(3) : s;
}

export function pageMarkdown(url: string) {
  const u = '/' + cleanPath(url);
  return allPages().find((p) => p.url === u || (u === '/' && p.url === '/'));
}

/* ---- endpoints ---- */

function typeOf(s: Schema | undefined): string {
  const f = flatten(s);
  if (!f) return 'any';
  if (f.oneOf?.length) return f.oneOf.map(typeOf).join(' | ');
  let t = Array.isArray(f.type) ? f.type.filter((x) => x !== 'null').join(' | ') : f.type || (f.properties ? 'object' : 'any');
  if (t === 'array') t = `array of ${typeOf(f.items)}`;
  return t;
}

function fields(s: Schema | undefined, depth = 0, hideReadOnly = false): string[] {
  const f = flatten(s);
  const props = f?.properties || flatten(f?.items)?.properties;
  if (!props || depth > 3) return [];
  const req = new Set((f?.properties ? f.required : flatten(f?.items)?.required) || []);
  const pad = '  '.repeat(depth);
  const out: string[] = [];
  for (const [k, v] of Object.entries(props)) {
    const x = flatten(v)!;
    if (hideReadOnly && x.readOnly) continue;
    const bits = [typeOf(x), req.has(k) ? 'required' : '', x.enum?.length ? `one of ${x.enum.filter((e) => e !== null).map((e) => `\`${e}\``).join(', ')}` : ''].filter(Boolean).join(', ');
    const desc = (x.description || '').replace(/\s*\n\s*/g, ' ').trim();
    out.push(`${pad}- \`${k}\` (${bits})${desc ? `: ${desc}` : ''}`);
    out.push(...fields(x, depth + 1, hideReadOnly));
  }
  return out;
}

export function endpointMarkdown(op: Operation, origin = ''): string {
  const ok = successStatus(op);
  const parts: string[] = [`# ${op.title}`, `\`${op.method.toUpperCase()} ${op.path}\``];
  if (requiresIdempotency(op)) parts.push('Requires an `Idempotency-Key` header.');
  if (op.description) parts.push(op.description.trim());
  const params = op.parameters.filter((p) => p.in !== 'cookie');
  if (params.length) {
    parts.push('## Parameters');
    parts.push(params.map((p) => `- \`${p.name}\` (${p.in}, ${typeOf(p.schema)}${p.required ? ', required' : ''})${p.description ? `: ${p.description.replace(/\s*\n\s*/g, ' ')}` : ''}`).join('\n'));
  }
  const bc = bodyContent(op);
  const body = bc?.schema;
  if (body) {
    parts.push(bc.kind === 'json' ? '## Request body' : `## Request body (\`${bc.mediaType}\`)`);
    parts.push(fields(body, 0, true).join('\n'));
    const ex = requestExample(op);
    if (ex !== undefined) parts.push('Example:\n\n```json\n' + JSON.stringify(ex, null, 2) + '\n```');
  }
  parts.push(`## Response ${ok}`);
  const rs = op.responses[ok]?.content?.['application/json']?.schema;
  if (rs) parts.push(fields(rs).join('\n'));
  const rex = responseExample(op, ok);
  if (rex !== undefined) parts.push('Example:\n\n```json\n' + JSON.stringify(rex, null, 2) + '\n```');
  const errs = Object.entries(op.responses).filter(([s]) => !s.startsWith('2'));
  if (errs.length) {
    parts.push('## Errors');
    parts.push(errs.map(([s, r]) => `- \`${s}\`: ${(r.description || '').replace(/\s*\n\s*/g, ' ').trim()}`).join('\n'));
  }
  parts.push(`Reference page: ${origin}${op.href}`);
  return parts.filter(Boolean).join('\n\n');
}

/** The Markdown behind any docs address: a page, or an endpoint at /reference/<group>/<op>. */
export function markdownFor(url: string, origin = ''): { url: string; markdown: string } | undefined {
  const c = cleanPath(url);
  const u = c.endsWith('.md') ? c.slice(0, -3) : c;
  const ref = u.match(/^reference\/([^/]+)\/([^/]+)$/);
  if (ref) {
    const op = getOperation(ref[1], ref[2]);
    return op ? { url: op.href, markdown: endpointMarkdown(op, origin) } : undefined;
  }
  const p = pageMarkdown(u === 'index' ? '/' : u);
  return p ? { url: p.url, markdown: p.markdown } : undefined;
}
