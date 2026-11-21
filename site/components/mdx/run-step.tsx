import { findOperation, responseExample, successStatus } from '@/lib/openapi';
import { RunStepClient } from './run-step-client';
import { exampleResponse } from '@/lib/echo';

/**
 * A guide step the reader can run. Server side: finds the endpoint in the spec so the console's
 * preview response is the spec's own example. Client side: shows the request and runs it.
 */
export function RunStep({ title, method, path, body, query, headers, pathParams, stepId, status: want, respond, children }: {
  title: string;
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  pathParams?: Record<string, string>;
  stepId?: string;
  /** which documented success response to show, when an endpoint has more than one (e.g. "202") */
  status?: string;
  /** fields to set on the example response, so it shows the outcome the step is about (e.g. a failed payout) */
  respond?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  const op = findOperation(method, path);
  const status = op ? (want && op.responses[want] ? want : successStatus(op)) : '200';
  const response = op ? { status: Number(status), body: { ...(exampleResponse(responseExample(op, status) ?? {}, body) as object), ...(respond || {}) } } : undefined;
  return (
    <RunStepClient
      title={title}
      stepId={stepId}
      request={{ method, path, baseUrl: 'https://api.antonpayments.dev', body, query, headers, pathParams }}
      response={response}
      reference={op?.href}
    >
      {children}
    </RunStepClient>
  );
}

