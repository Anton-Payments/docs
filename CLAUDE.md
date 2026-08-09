# docs — Claude Code Context

> Extends the root `../CLAUDE.md`. Read that first — the hard rules there apply here.

The **published API reference** at `docs.antonpayments.com`. Built with **Mintlify**
(`docs.json`, `.mdx` pages) — not Scalar, despite what older notes say.

## ⚠️ This repo is PUBLIC

It is the only Anton repo an outsider can read. That changes the rules:

- **Never** reference an internal hostname, a GCP project, a cluster or namespace name, a
  vendor account ID, an internal Linear issue, or an unreleased feature.
- **Never** commit a real key, token, or merchant identifier — even an expired or sandbox one.
  Examples must be obviously synthetic.
- Do not document an endpoint that is not deployed and stable. A published endpoint is a
  promise.
- Do not describe licences we do not hold. FINTRAC and RPAA are in process; only US FinCEN
  MSB registration is complete.

### Branch names are public too — do not use the Linear-generated one here

The root `CLAUDE.md` says to push the branch name Linear generates, because that is what
auto-links the PR. **That rule is for the twelve private repos. It is wrong here**, and it is
the easiest of these rules to break without noticing, because following the harness correctly
is what breaks it.

A Linear branch name carries the issue key *and the issue title verbatim* — so pushing
`ryan/eng-129-docsantonpaymentscom-has-not-deployed-since-2026-07-17-one` publishes both an
internal tracker key and a live operational-failure state to anyone watching a public repo.
Deleting the branch afterwards does not undo it: GitHub keeps PR head refs indefinitely and
they stay readable through the API.

**Name branches `docs/<slug>`, `fix/<slug>` or `feat/<slug>`, with no issue key** — the
convention every PR here used before #71. Attach the PR to the issue from the Linear side
instead; losing the automatic link is the cost, and it is much cheaper than the disclosure.

**GitHub Issues stays ENABLED here** — it is the external channel for developers integrating
against the reference, and the one exception to Linear-is-the-tracker-of-record. Anything real
that arrives gets triaged into Linear with a `Repo: docs` label and the GitHub link attached.

## Definition of done

| | |
|---|---|
| **Base branch** | `develop`. PR with `--base develop`. |
| Install | `npm ci` |
| Preview | `npm run dev` (`mintlify dev --port 3003`) |
| Spellcheck | `npm i -g mdx2vast && vale .` — must exit 0 |
| Check | Preview locally and confirm every changed page renders and every link resolves. |

CI runs **one** workflow, `.github/workflows/vale.yml` (spellcheck only). Rendering and links
are still unchecked, so **nothing catches a broken page but you** — a dead link or an
unrendered MDX block ships straight to a public site.

### Vale lints the whole repo, not your diff

This is the one that bites. Vale runs over every file, so a term you leave unaccepted does not
fail *your* PR — it fails **every PR afterwards**, including ones containing no prose at all,
such as a dependency lockfile bump. One missing word can hold the whole queue, and the person
who added it is the one person who never sees it fail.

So: run `vale .` over the **whole tree** before pushing, never just the files you touched.
Legitimate technical terms go in `styles/config/vocabularies/AntonDocs/accept.txt`; possessive
forms are separate tokens (`balancer` passing does not make `balancer's` pass). Mintlify's
hosted check reports `targetUrl: https://mintlify.com` — the marketing page — so when *it*
fails there is nothing to read on GitHub. The local run and the CI job are where you see why.

## Keeping it honest

- `openapi-merchant.yaml` is the merchant-facing contract. It must match what `api` actually
  serves — the API's own `api/docs/openapi-public.yaml` and `api/docs/path-map.md` are the
  upstream truth.
- A documented request/response shape that drifts from the API is worse than an undocumented
  one: an integrator builds against it and fails in production.
- `changelog.mdx` is merchant-facing. It is fed by issues labelled `customer-visible` in
  Linear — which is why that label is applied at issue creation, not at release time.
- Decimals are **strings** in this API. Examples must show them quoted.
