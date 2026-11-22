#!/usr/bin/env node
/*
  Crawls the running site from / and checks every internal link and #anchor.
  Fails on any broken page or anchor; warns on links that only work through a redirect
  (those should point at the new URL directly).
  Usage: node scripts/check-links.mjs [base=http://localhost:3004]
*/
const base = process.argv[2] || 'http://localhost:3004';
const seen = new Map(); // path -> { status, ids:Set, location }
const queue = ['/'];
const links = []; // { from, to }

async function fetchPage(p) {
  const res = await fetch(base + p, { redirect: 'manual' });
  const loc = res.headers.get('location');
  const html = res.status === 200 && (res.headers.get('content-type') || '').includes('html') ? await res.text() : '';
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  return { status: res.status, ids, hrefs, location: loc };
}

while (queue.length) {
  const p = queue.shift();
  if (seen.has(p)) continue;
  const r = await fetchPage(p);
  seen.set(p, r);
  if (r.status !== 200) continue;
  for (const h of r.hrefs) {
    if (!h.startsWith('/') || h.startsWith('//') || h.startsWith('/_next')) continue;
    const [path, hash] = h.split('#');
    const clean = path.split('?')[0] || p;
    links.push({ from: p, to: clean, hash });
    if (!seen.has(clean) && !queue.includes(clean) && !/\.(yaml|svg|png|json)$/.test(clean)) queue.push(clean);
  }
}

const broken = [], redirected = [], anchors = [];
for (const l of links) {
  let t = seen.get(l.to);
  if (!t) {
    const res = await fetch(base + l.to, { redirect: 'manual' });
    t = { status: res.status, ids: new Set(), location: res.headers.get('location') };
    seen.set(l.to, t);
  }
  if (t.status >= 300 && t.status < 400) redirected.push(`${l.from} → ${l.to} (redirects to ${t.location})`);
  else if (t.status !== 200) broken.push(`${l.from} → ${l.to} (${t.status})`);
  else if (l.hash && t.ids.size && !t.ids.has(decodeURIComponent(l.hash))) anchors.push(`${l.from} → ${l.to}#${l.hash}`);
}
const uniq = (a) => [...new Set(a)];
console.log(`Crawled ${[...seen.values()].filter((v) => v.status === 200).length} pages, ${links.length} internal links.`);
for (const [name, list] of [['Broken links', uniq(broken)], ['Missing anchors', uniq(anchors)], ['Links through a redirect', uniq(redirected)]]) {
  if (list.length) console.log(`\n${name} (${list.length}):\n  ` + list.join('\n  '));
}
process.exit(broken.length || anchors.length ? 1 : 0);
