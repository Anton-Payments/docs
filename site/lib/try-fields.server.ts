import 'server-only';
import { bodyContent, flatten, type Operation } from '@/lib/openapi';
import { isDecimalName, isSecretName, type FormField } from '@/lib/try-fields';

const short = (d?: string) => (d || '').split('\n')[0].slice(0, 160);

/**
 * Every value a reader can set on an endpoint in Try mode: its path and query parameters, its
 * headers (Idempotency-Key, Anton-Version), and the top-level body fields, whatever the body's media type. The
 * DPoP and Authorization headers aren't here: the reader's code signs those for each request.
 */
export function tryFields(op: Operation): FormField[] {
  const params: FormField[] = op.parameters
    .filter((p) => p.in === 'path' || p.in === 'query' || (p.in === 'header' && !/^(dpop|authorization)$/i.test(p.name)))
    .map((p) => ({
      name: p.in === 'header' && /idempotency-key/i.test(p.name) ? 'Idempotency-Key' : p.name,
      in: p.in as FormField['in'],
      required: !!p.required,
      kind: p.schema?.enum ? 'enum' : 'string',
      type: 'string',
      options: p.schema?.enum?.filter((x) => x !== null).map(String),
      description: short(p.description || p.schema?.description),
    }));

  const b = bodyContent(op);
  const schema = flatten(b?.schema);
  const req = new Set(schema?.required || []);
  const body: FormField[] = Object.entries(schema?.properties || {})
    .filter(([, v]) => !flatten(v)?.readOnly)
    .map(([name, v]) => {
      const f = flatten(v)!;
      const t = Array.isArray(f.type) ? f.type.find((x) => x !== 'null') : f.type;
      const decimal = t === 'string' && isDecimalName(name);
      let kind: FormField['kind'] =
        f.enum ? 'enum'
        : t === 'object' || t === 'array' || f.properties ? 'json'
        : t === 'integer' || t === 'number' ? 'number'
        : t === 'boolean' ? 'boolean'
        : 'string';
      if (f.format === 'binary') kind = 'file';
      if (isSecretName(name) && kind === 'string') kind = 'secret';
      return {
        name,
        in: 'body' as const,
        required: req.has(name),
        kind,
        decimal,
        type: decimal ? 'decimal string' : kind === 'file' ? 'file' : kind === 'json' ? (t === 'array' ? 'array' : 'object') : t || 'string',
        options: f.enum?.filter((x) => x !== null).map(String),
        description: short(f.description),
        envVar: kind === 'secret' ? `ANTON_${name.toUpperCase()}` : undefined,
      };
    })
    .sort((a, b2) => Number(b2.required) - Number(a.required));

  return [...params, ...body];
}
