# docs: rules for every agent

The published API reference, built with Mintlify (`docs.json`, `.mdx` pages). Not Scalar.
This repo is PUBLIC: write every line as if a stranger will read it, because one will.
Workspace hard rules are in ../CLAUDE.md and apply here.

## Done means

1. You previewed the change (`npm run dev`, port 3003) and every changed page renders and every link resolves.
   CI does not check rendering or links.
2. `vale .` over the WHOLE tree exits 0 (`npm i -g mdx2vast && vale .`), not just the files you touched.
3. You changed only what was asked.
4. You read REVIEW.md and checked every item the diff triggers.
Never make a check pass by changing the check.

## Where things live

```
openapi-merchant.yaml   merchant-facing contract; must match what the API serves
*.mdx, guides/, api-reference/, sandbox/   pages (nav in docs.json)
changelog.mdx           merchant-facing changelog
styles/config/vocabularies/AntonDocs/accept.txt   accepted spellcheck terms
.github/workflows/vale.yml                        whole-tree spellcheck on every PR
```

## Rules

- Never write an internal hostname, cloud project, cluster or namespace name, vendor account ID, tracker
  issue or unreleased feature.
- Never commit a real key, token or merchant identifier, even an expired or sandbox one. Examples are
  obviously synthetic.
- Document only endpoints that are deployed and stable. A published endpoint is a promise.
- Do not describe a licence or registration the company does not hold. Ask Ryan when unsure.
- `openapi-merchant.yaml` must match what the API actually serves; the API repo's public spec is the
  upstream copy. A documented shape that drifts is worse than none.
- Decimals are strings. Examples show them quoted.
- A legitimate technical term goes in `accept.txt`; possessives are separate tokens.

## Ship

Branch names are public: use `docs/<slug>`, `fix/<slug>` or `feat/<slug>`, never a tracker-generated name.
PR with `--base develop`. GitHub Issues stay enabled here for integrators.
Scope: stay in this repo unless Ryan names another.
