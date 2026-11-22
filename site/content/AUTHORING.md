# Writing pages for docs.antonpayments.com

Pages are MDX under `content/docs/`. The URL is the file path (`guides/register-a-payee.mdx` is
`/guides/register-a-payee`). This repo is public: no internal hostnames, tracker IDs, real keys or
unreleased features, ever.

## Front matter

```yaml
---
title: Register a payee            # a task, sentence case
description: One or two sentences: what the reader will have when they finish.
kind: guide                        # guide | concept | quickstart | webhooks | changelog | home
kicker: Core path · 1 of 3         # optional, guides only
---
```

`kind` sets the console default: hidden for guide, concept, quickstart, home and changelog; shown
for webhooks.

## The guide standard

1. One job per guide, named as a task.
2. The decision first: the one choice the reader makes before writing code (`<Decision>`).
3. The real lifecycle, drawn from the spec's enums (`<Lifecycle>`). Nothing invented.
4. What goes wrong: real status and error codes for this job, from the spec, with the fix (`<Errors>`).
5. One runnable step (`<RunStep>`), using spec example values.
6. No filler: no "In this guide, we will", no emoji, no "seamless", "robust", "simply", "just".
   Short sentences. Say who does what. Decimals are strings ("550.00").

## Components

```mdx
<Decision>
  <Choice title="A business" value='type: "business"' fields="legal_name, registration_number, email" picked>
    Suppliers and vendors.
  </Choice>
  <Choice title="An individual" value='type: "individual"' fields="first_name, last_name">
    Contractors and creators.
  </Choice>
</Decision>

<Lifecycle states="active, archived, blocked"
  notes="Ready to pay | Paused by you | Can't be restored by API"
  edges="<> you archive · you restore | blocked from any state">
  Optional sentence under the strip.
</Lifecycle>

<Errors>
  <ErrorRow status={422} code="duplicate_beneficiary">Look it up by `external_ref` and use that ID.</ErrorRow>
</Errors>

<RunStep title="Register the payee" method="POST" path="/v1/beneficiaries"
  headers={{ "Idempotency-Key": "ben-VND-2207" }}
  body={{ type: "business", country: "DE", external_ref: "VND-2207" }}>
  One line on what this call does.
</RunStep>

<Endpoint method="POST" path="/v1/payouts" />   <StatusPill status="on_hold" />

<Note>, <Tip>, <Warning>, <Danger>   callouts
<CardGroup cols={2}><Card title="..." href="/guides/...">...</Card></CardGroup>
<Steps><Step title="...">...</Step></Steps>
<Tabs><Tab title="Node">...</Tab></Tabs>   <Accordion title="...">...</Accordion>
```

Code fences: ```` ```bash cURL ```` (language, then a title). `RunStep` paths must be an endpoint in
`openapi-merchant.yaml` exactly as written there (`/v1/beneficiaries/{id}/instruments`, with
`pathParams={{ id: "ben_..." }}`).

Links: new URLs only. Guides live under `/guides/...`, concepts under `/concepts/...`, endpoints under
`/reference/<group>/<slug>` (the slug is the old `api-reference/` file name).
