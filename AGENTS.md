# docs: rules for every agent

The public developer docs at docs.antonpayments.com: a Next.js app in `site/` (Fumadocs for the
MDX pages, our own components for everything else), served from Cloud Run.
This repo is PUBLIC: write every line as if a stranger will read it, because one will.
Workspace hard rules are in ../CLAUDE.md and apply here.

## Done means

1. In `site/`: `npm run typecheck`, `npm run build`, then `npm start` and `npm run check:links` all pass.
2. You looked at every changed page in a browser (`npm run dev`, port 3004), light and dark.
3. `vale .` from the repo root exits 0 over the WHOLE tree (`npm i -g mdx2vast`), not just your files.
4. You changed only what was asked.
5. You read REVIEW.md and checked every item the diff triggers.
Never make a check pass by changing the check.

## Where things live

```
openapi-merchant.yaml        the merchant contract, synced from the API repo; never hand-edit it
site/content/docs/           guides, concepts, Intelligence pages, changelog (.mdx)
site/lib/nav.ts              both sidebars, the core paths and the route stages: file a page once, here
site/lib/redirects.json      old addresses that must keep working
site/components/             one component per job; a page never brings its own button or input
styles/config/vocabularies/AntonDocs/accept.txt   accepted spellcheck terms
```

Branches: `develop` deploys to the preview (docs-preview.antonpayments.com, never indexed);
`main` deploys to docs.antonpayments.com. Promotion is `develop` to `main` by PR.

## Rules

- Never write an internal hostname, cloud project, cluster or namespace name, vendor account ID, tracker
  issue or unreleased feature.
- Never commit a real key, token or merchant identifier, even an expired or sandbox one. Examples are
  obviously synthetic.
- Document only endpoints that are deployed and stable. A published endpoint is a promise.
- Do not describe a licence or registration the company does not hold. Ask Ryan when unsure.
- `openapi-merchant.yaml` must match what the API serves. It arrives by PR from the API repo's
  sync; the `anton-spec-sync` header line proves it was not edited by hand.
- Decimals are strings. Examples show them quoted.
- Every caption, card and table cell adds a fact. Never restate the heading or explain the page.
- A legitimate technical term goes in `accept.txt`; possessives are separate tokens.

## Ship

Branch names are public: use `docs/<slug>`, `fix/<slug>` or `feat/<slug>`, never a tracker-generated name.
PR with `--base develop`. GitHub Issues stay enabled here for integrators.
Scope: stay in this repo unless Ryan names another.
