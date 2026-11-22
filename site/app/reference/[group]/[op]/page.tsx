import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOperation, loadSpec, requestExample, requestExamples, responseExample, successStatus } from '@/lib/openapi';
import { guidesUsing } from '@/lib/guide-usage';
import { ConsolePage } from '@/components/shell/providers';
import { endpointMarkdown } from '@/lib/page-markdown';
import { SITE_URL } from '@/lib/site';
import { OperationDocs, OperationHeader, exampleRequest } from '@/components/reference/operation';
import { ExampleSwitch } from '@/components/reference/example-switch';
import { GuidePane } from '@/components/guide/pane';
import { ReportLink } from '@/components/shell/report-link';
import { exampleResponse } from '@/lib/echo';

/*
  An endpoint, on the same engine as the guides: the code panel starts locked open beside the
  fields, every field name points at its line in the request or the response, and the spec's
  alternative examples are a switch that rewrites the request.
*/

type Props = { params: Promise<{ group: string; op: string }> };

export default async function OperationPage({ params }: Props) {
  const { group, op: slug } = await params;
  const op = getOperation(group, slug);
  if (!op) notFound();
  const status = successStatus(op);
  const body = requestExample(op);
  const request = exampleRequest(op, body);
  const response = { status: Number(status), body: exampleResponse(responseExample(op, status) ?? {}, body) };

  // each example as the full set of fields it sends, with the others' extra keys removed
  const exs = requestExamples(op).filter((e) => e.value && typeof e.value === 'object' && !Array.isArray(e.value));
  const keys = new Set(exs.flatMap((e) => Object.keys(e.value as object)));
  const variants = exs.map((e) => ({
    label: e.summary,
    set: Object.fromEntries([...keys].map((k) => [k, (e.value as Record<string, unknown>)[k] ?? null])),
  }));
  const guides = guidesUsing(op.method, op.path);

  return (
    <>
      <ConsolePage
        kind="reference"
        target={{ kind: 'request', title: op.title, request, response }}
      />
      <main className="main g2 ref" id="content">
        <div className="main-inner">
          <OperationHeader op={op} view="docs" markdown={endpointMarkdown(op, SITE_URL)} />
          {guides.length > 0 && (
            <p className="ref-used">
              <span>Walked through in</span>
              {guides.map((g) => <Link key={g.url} href={g.url}>{g.title}</Link>)}
            </p>
          )}
          <article className="prose ref-prose">
            <div hidden data-pane="run" data-title={op.title} data-req={JSON.stringify(request)} data-resp={JSON.stringify(response)} />
            <ExampleSwitch variants={variants} />
            <OperationDocs op={op} />
          </article>
          <ReportLink path={op.href} title={op.title} />
        </div>
      </main>
      <GuidePane startOpen />
    </>
  );
}

export function generateStaticParams() {
  return loadSpec().ops.map((o) => ({ group: o.groupSlug, op: o.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group, op: slug } = await params;
  const op = getOperation(group, slug);
  return { title: op ? op.title : 'Not found', description: op?.summary, alternates: op ? { canonical: op.href } : undefined, openGraph: op ? { title: op.title, description: op.summary, url: op.href } : undefined };
}
