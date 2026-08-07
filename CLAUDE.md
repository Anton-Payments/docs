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

**GitHub Issues stays ENABLED here** — it is the external channel for developers integrating
against the reference, and the one exception to Linear-is-the-tracker-of-record. Anything real
that arrives gets triaged into Linear with a `Repo: docs` label and the GitHub link attached.

## Definition of done

| | |
|---|---|
| **Base branch** | `develop`. PR with `--base develop`. |
| Install | `npm ci` |
| Preview | `npm run dev` (`mintlify dev --port 3003`) |
| Check | Preview locally and confirm every changed page renders and every link resolves. |

There are no CI workflows in this repo, so **nothing catches a broken page but you.** A dead
link or an unrendered MDX block ships straight to a public site.

## Keeping it honest

- `openapi-merchant.yaml` is the merchant-facing contract. It must match what `api` actually
  serves — the API's own `api/docs/openapi-public.yaml` and `api/docs/path-map.md` are the
  upstream truth.
- A documented request/response shape that drifts from the API is worse than an undocumented
  one: an integrator builds against it and fails in production.
- `changelog.mdx` is merchant-facing. It is fed by issues labelled `customer-visible` in
  Linear — which is why that label is applied at issue creation, not at release time.
- Decimals are **strings** in this API. Examples must show them quoted.
