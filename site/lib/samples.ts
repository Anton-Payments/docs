/*
  Request samples in the languages the docs publish (bash, JavaScript, PHP, Go, Java).
  Pure functions, used on the server for the reference pages and in the browser for the console,
  so a sample always matches the values the reader is about to send.
*/

export type SampleInput = {
  method: string;
  baseUrl: string;
  path: string;
  pathParams?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
};

export type Lang = 'curl' | 'node' | 'php' | 'go' | 'java';
export const LANGS: { id: Lang; label: string; shiki: string }[] = [
  { id: 'curl', label: 'cURL', shiki: 'bash' },
  { id: 'node', label: 'Node', shiki: 'javascript' },
  { id: 'php', label: 'PHP', shiki: 'php' },
  { id: 'go', label: 'Go', shiki: 'go' },
  { id: 'java', label: 'Java', shiki: 'java' },
];

export function buildUrl(i: SampleInput) {
  let p = i.path;
  for (const [k, v] of Object.entries(i.pathParams || {})) p = p.replace(`{${k}}`, v || `{${k}}`);
  const q = Object.entries(i.query || {}).filter(([, v]) => v !== '' && v !== undefined);
  const qs = q.length ? '?' + q.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
  return i.baseUrl + p + qs;
}

function json(body: unknown, indent: number) {
  const s = JSON.stringify(body, null, 2);
  const pad = ' '.repeat(indent);
  return s.split('\n').map((l, i) => (i === 0 ? l : pad + l)).join('\n');
}

const isForm = (h?: Record<string, string>) => /x-www-form-urlencoded/i.test(h?.['Content-Type'] || '');

export function sample(lang: Lang, i: SampleInput): string {
  const url = buildUrl(i);
  const m = i.method.toUpperCase();
  const isToken = i.path === '/oauth/token';
  const headers: [string, string][] = [];
  if (!isToken) headers.push(['Authorization', 'DPoP $ANTON_ACCESS_TOKEN']);
  headers.push(['DPoP', '$DPOP_PROOF']);
  for (const [k, v] of Object.entries(i.headers || {})) if (v) headers.push([k, v]);
  const hasBody = i.body !== undefined && i.body !== null && !(typeof i.body === 'object' && Object.keys(i.body as object).length === 0 && m === 'GET');
  if (hasBody && !isForm(i.headers)) headers.push(['Content-Type', 'application/json']);

  if (lang === 'curl') {
    // the URL gets its own line so the request reads top to bottom without scrolling sideways
    const lines = m === 'GET' ? [`curl ${url}`] : [`curl -X ${m}`, `  ${url}`];
    for (const [k, v] of headers) lines.push(`  -H "${k}: ${v}"`);
    if (hasBody) {
      if (isForm(i.headers) && typeof i.body === 'object') {
        for (const [k, v] of Object.entries(i.body as Record<string, string>)) lines.push(`  -d ${k}=${v}`);
      } else lines.push(`  -d '${json(i.body, 2)}'`);
    }
    return lines.join(' \\\n');
  }

  const env = (v: string) => v.replace(/\$([A-Z_]+)/g, (_, n) => `\${${n}}`);
  if (lang === 'node') {
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization') return `    Authorization: \`DPoP \${process.env.ANTON_ACCESS_TOKEN}\`,`;
        if (k === 'DPoP') return `    DPoP: await dpopProof('${m}', url), // fresh proof per request`;
        return `    '${k}': '${v}',`;
      })
      .join('\n');
    const body = hasBody ? `,\n  body: JSON.stringify(${json(i.body, 2)})` : '';
    return `const url = '${url}';\nconst res = await fetch(url, {\n  method: '${m}',\n  headers: {\n${h}\n  }${body},\n});\nconst data = await res.json();`;
  }

  if (lang === 'php') {
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization') return `        'Authorization' => 'DPoP ' . getenv('ANTON_ACCESS_TOKEN'),`;
        if (k === 'DPoP') return `        'DPoP' => dpop_proof('${m}', $url), // fresh proof per request`;
        return `        '${k}' => '${v}',`;
      })
      .join('\n');
    const body = hasBody ? `\n    'json' => ${phpArray(i.body, 4)},` : '';
    return `$url = '${url}';\n$response = (new GuzzleHttp\\Client())->request('${m}', $url, [\n    'headers' => [\n${h}\n    ],${body}\n]);\n$data = json_decode($response->getBody(), true);`;
  }

  if (lang === 'java') {
    // java.net.http (Java 11+); the JSON body is a text block (Java 15+)
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization') return `    .header("Authorization", "DPoP " + token)`;
        if (k === 'DPoP') return `    // a fresh DPoP proof for every request\n    .header("DPoP", dpopProof("${m}", url))`;
        return `    .header("${k}", "${v}")`;
      })
      .join('\n');
    const pre = [`var url = "${url}";`];
    if (headers.some(([k]) => k === 'Authorization')) pre.push('var token = System.getenv("ANTON_ACCESS_TOKEN");');
    let method = m === 'GET' ? '    .GET()' : `    .method("${m}", BodyPublishers.noBody())`;
    if (hasBody) {
      if (isForm(i.headers) && typeof i.body === 'object') {
        const form = Object.entries(i.body as Record<string, string>).map(([k, v]) => `${k}=${v}`).join('&');
        pre.push(`var body = "${form}";`);
      } else {
        const block = JSON.stringify(i.body, null, 2).split('\n').map((l) => '    ' + l).join('\n');
        pre.push(`var body = """\n${block}""";`);
      }
      method = `    .method("${m}", BodyPublishers.ofString(body))`;
    }
    return `${pre.join('\n')}\n\nvar request = HttpRequest.newBuilder(URI.create(url))\n${h}\n${method}\n    .build();\nvar response = HttpClient.newHttpClient()\n    .send(request, BodyHandlers.ofString());`;
  }

  // go
  const h = headers
    .map(([k, v]) => {
      if (k === 'Authorization') return `req.Header.Set("Authorization", "DPoP "+os.Getenv("ANTON_ACCESS_TOKEN"))`;
      if (k === 'DPoP') return `req.Header.Set("DPoP", dpopProof("${m}", url)) // fresh proof per request`;
      return `req.Header.Set("${k}", "${env(v)}")`;
    })
    .join('\n');
  const body = hasBody ? `body := strings.NewReader(\`${JSON.stringify(i.body, null, 2)}\`)\n` : '';
  return `url := "${url}"\n${body}req, _ := http.NewRequest("${m}", url, ${hasBody ? 'body' : 'nil'})\n${h}\nres, err := http.DefaultClient.Do(req)`;
}

function phpArray(v: unknown, indent: number): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(v)) return `[${v.map((x) => phpArray(x, indent + 4)).join(', ')}]`;
  if (v && typeof v === 'object') {
    const inner = Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${pad}    '${k}' => ${phpArray(x, indent + 4)},`)
      .join('\n');
    return `[\n${inner}\n${pad}]`;
  }
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  if (v === null) return 'null';
  return String(v);
}

/* ---- a small highlighter for the console, where code changes as the reader types ---- */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlightJson(src: string): string {
  return esc(src).replace(
    /(&quot;|")((?:\\.|[^"\\])*)"(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
    (m, _q, str, colon, kw, num) => {
      if (str !== undefined) return colon ? `<span class="c-k">"${str}"</span>${colon}` : `<span class="c-s">"${str}"</span>`;
      if (kw) return `<span class="c-n">${kw}</span>`;
      if (num) return `<span class="c-n">${num}</span>`;
      return m;
    },
  );
}

export function highlightCode(src: string, lang: Lang): string {
  const kw: Record<Lang, string[]> = {
    curl: ['curl'],
    node: ['const', 'await', 'new', 'return', 'async', 'function'],
    php: ['new', 'return', 'function'],
    go: ['func', 'return', 'if', 'err', 'nil', 'var'],
    java: ['var', 'new', 'return', 'final'],
  };
  const words = kw[lang].join('|');
  // Java strings never span lines (its JSON body is a """ text block whose lines are strings of their own)
  const re =
    lang === 'java'
      ? new RegExp(`(\\/\\/[^\\n]*)|("""|"(?:\\\\.|[^"\\\\\\n])*")|\\b(${words})\\b`, 'g')
      : new RegExp(`(\\/\\/[^\\n]*|#[^\\n]*)|('(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*"|\`[^\`]*\`)|\\b(${words})\\b`, 'g');
  return esc(src).replace(
    re,
    (m, comment, str, k) => {
      if (comment) return lang === 'curl' && !comment.startsWith('#') ? m : `<span class="c-d">${comment}</span>`;
      if (str) return `<span class="c-s">${str}</span>`;
      if (k) return `<span class="c-k">${k}</span>`;
      return m;
    },
  );
}
