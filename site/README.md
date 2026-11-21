# docs.antonpayments.com — the new docs app

A Next.js app (Fumadocs for content) that replaces the Mintlify site. It lives beside the Mintlify
files so the live site keeps running until cutover; `.mintignore` keeps Mintlify away from `site/`.

## Run it

```bash
cd site
npm ci
npm run dev            # http://localhost:3004
```

## What's where

| Path | What |
| --- | --- |
| `content/docs/` | Every page, as MDX. The URL is the file path. See `content/AUTHORING.md`. |
| `../openapi-merchant.yaml` | The contract. The API reference, the console and search all read it. |
| `lib/openapi.ts` | Loads the spec. The published endpoints, their order and slugs come from `../api-reference/` and `../docs.json`, so the reference publishes exactly what is published today. |
| `lib/nav.ts` | The sidebar, and the console default for each kind of page. |
| `lib/redirects.json` | Every URL the Mintlify site published, mapped to its new home. |
| `lib/mock.ts` | Preview data for the signed-in experience. Replaced when sign-in is wired. |
| `components/console/` | The console dock. Sends return the spec's example response until it is wired. |
| `app/globals.css` | The whole design: brand tokens from the www brand kit, light and dark. |

## Checks (run all of them before a PR)

```bash
npm run build          # type check and render every page
npm run start &        # then, against the running build:
npm run check:links    # crawls every page; fails on a broken link or anchor
cd .. && vale site/content
```

## Not wired yet (on purpose)

- Sign-in: the account in the sidebar is preview data. "View signed out" shows the signed-out state.
- The console: Send returns the example response from the spec, labelled MOCK.
- Snippet testing: every code block says "Not yet tested in sandbox" until the runner exists.
- Request history, request lookup and the webhook stream show preview data.
