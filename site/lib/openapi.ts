import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

/*
  The merchant contract lives at the repo root (openapi-merchant.yaml) and stays the single source.
  Which operations are published, their order, groups and URL slugs come from
  lib/reference-nav.json (see readPublished).
*/

const ROOT = path.resolve(process.cwd(), '..');
const SPEC_PATH = path.join(ROOT, 'openapi-merchant.yaml');

export type Schema = {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  example?: unknown;
  examples?: unknown[];
  default?: unknown;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  additionalProperties?: boolean | Schema;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
  $ref?: string;
};

export type Parameter = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: Schema;
  example?: unknown;
};

export type ResponseObj = {
  description?: string;
  content?: Record<string, { schema?: Schema; example?: unknown; examples?: Record<string, { summary?: string; value?: unknown }> }>;
  headers?: Record<string, { description?: string; schema?: Schema }>;
};

export type Operation = {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: Parameter[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: Schema; example?: unknown; examples?: Record<string, { summary?: string; value?: unknown }> }>;
  };
  responses: Record<string, ResponseObj>;
  security?: Record<string, string[]>[];
  /** derived */
  slug: string;
  group: string;
  groupSlug: string;
  title: string;
  href: string;
};

export type RefGroup = { title: string; slug: string; ops: Operation[] };

type Spec = {
  info?: { title?: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, Record<string, unknown>>;
};

let cache: { spec: Spec; groups: RefGroup[]; ops: Operation[] } | null = null;
let cachedAt = 0;

function resolveRef(spec: Spec, ref: string): unknown {
  if (!ref.startsWith('#/')) return {};
  return ref
    .slice(2)
    .split('/')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), spec);
}

/** Deep-dereference $refs, guarding against cycles. */
function deref<T>(spec: Spec, node: T, seen: Set<string> = new Set()): T {
  if (Array.isArray(node)) return node.map((n) => deref(spec, n, seen)) as T;
  if (!node || typeof node !== 'object') return node;
  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string') {
    const ref = obj.$ref;
    if (seen.has(ref)) return { description: obj.description, type: 'object', title: ref.split('/').pop() } as T;
    const next = new Set(seen);
    next.add(ref);
    const target = resolveRef(spec, ref);
    const { $ref: _r, ...rest } = obj;
    return { ...(deref(spec, target, next) as object), ...rest } as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = deref(spec, v, seen);
  return out as T;
}

/** Merge allOf into one schema so it can be drawn as a single field list. */
export function flatten(s: Schema | undefined): Schema | undefined {
  if (!s) return s;
  if (s.allOf && s.allOf.length) {
    const parts = s.allOf.map((p) => flatten(p)!).filter(Boolean);
    const merged: Schema = { ...s, allOf: undefined, type: 'object', properties: {}, required: [] };
    for (const p of parts) {
      merged.properties = { ...merged.properties, ...(p.properties || {}) };
      merged.required = [...(merged.required || []), ...(p.required || [])];
      if (!merged.description && p.description) merged.description = p.description;
    }
    merged.properties = { ...merged.properties, ...(s.properties || {}) };
    return merged;
  }
  return s;
}

const ACRONYMS = new Set(['FX', 'PII', 'CSV', 'PDF', 'RFI', 'IP', 'API', 'URL', 'ID', 'IDS', 'KYB', 'UBO', 'OAUTH', 'JWKS', 'USDC', 'DPOP', 'JSON']);
const KEEP = (w: string) => w.split('-').map((p) => { const core = p.toUpperCase().replace(/[^A-Z]/g, ''); return ACRONYMS.has(core) ? (core === 'DPOP' ? 'DPoP' : core === 'OAUTH' ? 'OAuth' : p.replace(/[a-z]+/i, core)) : null; });
export function sentenceCase(s: string): string {
  return s
    .split(' ')
    .map((w, i) => {
      const parts = KEEP(w);
      if (parts.some((x) => x !== null)) return w.split('-').map((p, j) => parts[j] ?? (i === 0 && j === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p.toLowerCase())).join('-');
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase();
    })
    .join(' ');
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

type PublishedPage = { slug: string; title: string; method: string; path: string };
type PublishedGroup = { title: string; folder: string; ops: PublishedPage[] };

/*
  Which endpoints the reference publishes, in what order, under what URL: lib/reference-nav.json.
  It is the publishing decision, kept beside the site rather than inferred from the spec: a new
  endpoint in the spec appears in the reference only once it is added here.
*/
function readPublished(): PublishedGroup[] {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/reference-nav.json'), 'utf8')) as PublishedGroup[];
}

export function loadSpec() {
  // in development an edited spec shows up without a restart
  const mtime = process.env.NODE_ENV === 'production' && cache ? cachedAt : fs.statSync(SPEC_PATH).mtimeMs;
  if (cache && mtime === cachedAt) return cache;
  cachedAt = mtime;
  const raw = loadYaml(fs.readFileSync(SPEC_PATH, 'utf8')) as Spec;
  const navGroups = readPublished();
  const ops: Operation[] = [];
  const groups: RefGroup[] = [];
  for (const g of navGroups) {
    const group: RefGroup = { title: g.title, slug: slugify(g.folder), ops: [] };
    for (const published of g.ops) {
      const pg = { ...published };
      // match on path shape, so a renamed path parameter ({importID} vs {import_id}) still resolves
      const shape = (x: string) => x.replace(/\{[^}]+\}/g, '{}');
      const specPath = raw.paths[pg.path] ? pg.path : Object.keys(raw.paths).find((k) => shape(k) === shape(pg.path)) || pg.path;
      pg.path = specPath;
      const pathItem = raw.paths[specPath] as Record<string, unknown> | undefined;
      const opRaw = pathItem?.[pg.method] as Record<string, unknown> | undefined;
      if (!pathItem || !opRaw) continue;
      const shared = (pathItem.parameters as unknown[]) || [];
      const op = deref(raw, { ...opRaw, parameters: [...shared, ...((opRaw.parameters as unknown[]) || [])] }) as unknown as Operation;
      op.method = pg.method;
      op.path = pg.path;
      op.parameters = (op.parameters || []).filter(Boolean);
      op.responses = op.responses || {};
      op.slug = pg.slug;
      op.group = g.title;
      op.groupSlug = group.slug;
      op.title = sentenceCase(pg.title || op.summary || pg.slug);
      op.href = `/reference/${group.slug}/${pg.slug}`;
      group.ops.push(op);
      ops.push(op);
    }
    if (group.ops.length) groups.push(group);
  }
  cache = { spec: raw, groups, ops };
  return cache;
}

export function getOperation(groupSlug: string, slug: string) {
  return loadSpec().ops.find((o) => o.groupSlug === groupSlug && o.slug === slug);
}

export function findOperation(method: string, p: string) {
  return loadSpec().ops.find((o) => o.method === method.toLowerCase() && o.path === p);
}

/** Build an example value from a schema: explicit example first, then enum, then a typed placeholder. */
export function exampleFor(s: Schema | undefined, depth = 0): unknown {
  const f = flatten(s);
  if (!f || depth > 6) return undefined;
  if (f.example !== undefined) return f.example;
  if (f.examples && f.examples.length) return f.examples[0];
  if (f.default !== undefined) return f.default;
  if (f.enum && f.enum.length) return f.enum[0];
  if (f.oneOf?.length) return exampleFor(f.oneOf[0], depth + 1);
  if (f.anyOf?.length) return exampleFor(f.anyOf[0], depth + 1);
  const t = Array.isArray(f.type) ? f.type.find((x) => x !== 'null') : f.type;
  if (t === 'object' || f.properties) {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f.properties || {})) {
      if (v.readOnly && depth === 0) continue;
      const ex = exampleFor(v, depth + 1);
      if (ex !== undefined) o[k] = ex;
    }
    return o;
  }
  if (t === 'array') {
    const ex = exampleFor(f.items, depth + 1);
    return ex === undefined ? [] : [ex];
  }
  if (t === 'integer' || t === 'number') return 0;
  if (t === 'boolean') return false;
  if (t === 'string') {
    if (f.format === 'date-time') return '2026-11-21T14:02:11Z';
    if (f.format === 'date') return '2026-11-21';
    if (f.format === 'uri' || f.format === 'url') return 'https://example.com';
    if (f.format === 'email') return 'ops@example.com';
    if (f.format === 'uuid') return '7f3c2e1a-4b0d-4c8a-9e51-0b7e51d23c8a';
    return 'string';
  }
  return undefined;
}

/** The request body's media type, as the samples and Try mode write it. */
export type BodyKind = 'json' | 'form' | 'multipart';
const MEDIA: Record<BodyKind, string> = { json: 'application/json', form: 'application/x-www-form-urlencoded', multipart: 'multipart/form-data' };

/** The operation's request body: which kind, its schema and its media entry. JSON wins when several are offered. */
export function bodyContent(op: Operation) {
  const c = op.requestBody?.content;
  if (!c) return undefined;
  for (const kind of ['json', 'form', 'multipart'] as BodyKind[]) {
    const m = c[MEDIA[kind]];
    if (m) return { kind, mediaType: MEDIA[kind], schema: m.schema, media: m };
  }
  return undefined;
}

/** A file field's example value: "@" and a file name, which the samples attach. */
export const exampleFileName = (op: Operation) => `@${op.groupSlug}.csv`;

export function requestExample(op: Operation): unknown {
  const b = bodyContent(op);
  if (!b) return undefined;
  const c = b.media;
  if (c.example !== undefined) return c.example;
  const first = c.examples && Object.values(c.examples)[0];
  if (first?.value !== undefined) return first.value;
  if (b.kind === 'multipart') {
    // the parts a request can't go without; a file part is a file name the samples attach
    const f = flatten(b.schema);
    const req = new Set(f?.required || []);
    return Object.fromEntries(Object.entries(f?.properties || {}).filter(([k]) => req.has(k)).map(([k, v]) => [k, flatten(v)?.format === 'binary' ? exampleFileName(op) : exampleFor(v)]));
  }
  return exampleFor(c.schema);
}

export function requestExamples(op: Operation): { key: string; summary: string; value: unknown }[] {
  const c = bodyContent(op)?.media;
  if (!c) return [];
  if (c.examples) return Object.entries(c.examples).map(([key, e]) => ({ key, summary: e.summary || key, value: e.value }));
  const v = requestExample(op);
  return v === undefined ? [] : [{ key: 'default', summary: 'Example', value: v }];
}

export function responseExample(op: Operation, status: string): unknown {
  const r = op.responses[status];
  const c = r?.content?.['application/json'] || (r?.content && Object.values(r.content)[0]);
  if (!c) return undefined;
  if (c.example !== undefined) return c.example;
  const first = c.examples && Object.values(c.examples)[0];
  if (first?.value !== undefined) return first.value;
  return exampleFor(c.schema);
}

export function successStatus(op: Operation): string {
  return Object.keys(op.responses).find((s) => s.startsWith('2')) || '200';
}

export function requiresIdempotency(op: Operation) {
  return op.parameters.some((p) => p.in === 'header' && /idempotency-key/i.test(p.name));
}

export function serverUrls(): { sandbox: string; production: string } {
  return { sandbox: 'https://api.antonpayments.dev', production: 'https://api.antonpayments.com' };
}
