import { flatten, getOperation, loadSpec } from '@/lib/openapi';
import { OG_SIZE, ogCard, type OgRow } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Anton API reference';

/** The description's first sentence, without markdown, unless it only repeats the title. */
function firstSentence(d: string | undefined, title: string | undefined) {
  const t = (d || '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*?/g, '').split(/\n\n/)[0].replace(/\s+/g, ' ').trim();
  const one = t.match(/^.*?[.!?](\s|$)/)?.[0].trim() || t;
  return one && one.toLowerCase() !== (title || '').toLowerCase() ? one : undefined;
}

export default async function Image({ params }: { params: Promise<{ group: string; op: string }> }) {
  const { group, op: slug } = await params;
  const op = getOperation(group, slug);
  const groupTitle = loadSpec().groups.find((g) => g.slug === group)?.title;
  if (!op) return ogCard({ title: 'API reference' });
  // what the request takes: path parameters, then body fields (required first), then query parameters
  const schema = flatten(op.requestBody?.content?.['application/json']?.schema);
  const req = new Set(schema?.required || []);
  const body: OgRow[] = Object.entries(schema?.properties || {})
    .filter(([, v]) => !v.readOnly)
    .map(([name]) => ({ label: name, state: 'field' as const, required: req.has(name) }))
    .sort((x, y) => Number(!!y.required) - Number(!!x.required));
  const param = (where: string): OgRow[] => op.parameters
    .filter((p) => p.in === where)
    .map((p) => ({ label: where === 'path' ? `{${p.name}}` : p.name, state: 'field' as const, required: !!p.required }));
  const rows = [...param('path'), ...body, ...param('query')].slice(0, 8);
  return ogCard({
    title: op.title,
    lede: firstSentence(op.description, op.title) || (groupTitle ? `${groupTitle}, API reference` : undefined),
    big: op.method.toUpperCase(),
    heading: op.path,
    rows,
  });
}

export function generateStaticParams() {
  return loadSpec().ops.map((o) => ({ group: o.groupSlug, op: o.slug }));
}
