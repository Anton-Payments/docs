import { getOperation, loadSpec } from '@/lib/openapi';
import { OG_SIZE, ogCard } from '@/lib/og';

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
  return ogCard({
    eyebrow: op ? `API reference · ${groupTitle}` : 'API reference',
    title: op?.title || 'API reference',
    lede: firstSentence(op?.description, op?.title),
    endpoint: op ? { method: op.method.toUpperCase(), path: op.path } : undefined,
  });
}

export function generateStaticParams() {
  return loadSpec().ops.map((o) => ({ group: o.groupSlug, op: o.slug }));
}
