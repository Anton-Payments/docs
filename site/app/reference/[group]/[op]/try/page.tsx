import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { flatten, getOperation, loadSpec, requestExample, responseExample, successStatus } from '@/lib/openapi';
import { ConsolePage } from '@/components/shell/providers';
import { OperationHeader, exampleRequest } from '@/components/reference/operation';
import { TryForm, type FormField } from '@/components/reference/try-form';

type Props = { params: Promise<{ group: string; op: string }> };

export default async function TryPage({ params }: Props) {
  const { group, op: slug } = await params;
  const op = getOperation(group, slug);
  if (!op) notFound();
  const body = requestExample(op);
  const req = exampleRequest(op, body);
  const status = successStatus(op);
  const schema = flatten(op.requestBody?.content?.['application/json']?.schema);
  const req2 = new Set(schema?.required || []);
  const bodyFields: FormField[] = Object.entries(schema?.properties || {})
    .filter(([, v]) => !v.readOnly)
    .map(([k, v]) => {
      const f = flatten(v)!;
      const t = Array.isArray(f.type) ? f.type.find((x) => x !== 'null') : f.type;
      const kind: FormField['kind'] = f.enum ? 'enum' : t === 'object' || t === 'array' || f.properties ? 'json' : t === 'integer' || t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'string';
      return { name: k, in: 'body' as const, required: req2.has(k), kind, options: f.enum?.filter((x) => x !== null).map(String), description: (f.description || '').split('\n')[0].slice(0, 90) };
    })
    .sort((a, b) => Number(b.required) - Number(a.required));
  const paramFields: FormField[] = op.parameters
    .filter((p) => p.in === 'path' || p.in === 'query' || (p.in === 'header' && /idempotency-key/i.test(p.name)))
    .map((p) => ({ name: p.in === 'header' ? 'Idempotency-Key' : p.name, in: p.in as FormField['in'], required: !!p.required, kind: (p.schema?.enum ? 'enum' : 'string') as FormField['kind'], options: p.schema?.enum?.map(String), description: (p.description || '').split('\n')[0].slice(0, 90) }));
  return (
    <>
      <ConsolePage kind="try" target={{ kind: 'request', title: op.title, request: req, response: { status: Number(status), body: responseExample(op, status) ?? {} }, hint: `Send calls ${op.method.toUpperCase()} ${op.path} in your sandbox. No real money moves.` }} />
      <main className="main">
        <div className="main-inner wide">
          <OperationHeader op={op} view="try" />
          <TryForm initial={req} paramFields={paramFields} bodyFields={bodyFields} />
        </div>
      </main>
    </>
  );
}

export function generateStaticParams() {
  return loadSpec().ops.map((o) => ({ group: o.groupSlug, op: o.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group, op: slug } = await params;
  const op = getOperation(group, slug);
  return { title: op ? `Try ${op.title.toLowerCase()}` : 'Not found' };
}
