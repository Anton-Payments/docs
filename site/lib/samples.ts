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

/** The documented response a request is shown with; nothing in the docs sends a request yet. */
export type MockResponse = { status: number; body: unknown; headers?: Record<string, string>; ms?: number };

type BodyKind = 'json' | 'form' | 'multipart';
const contentType = (h?: Record<string, string>) => h?.['Content-Type'] || h?.['content-type'] || '';
export function bodyKind(h?: Record<string, string>): BodyKind {
  const ct = contentType(h);
  if (/x-www-form-urlencoded/i.test(ct)) return 'form';
  if (/multipart\/form-data/i.test(ct)) return 'multipart';
  return 'json';
}

/** A multipart file field is written "@name.csv": the file to attach. */
const isFile = (v: unknown): v is string => typeof v === 'string' && v.startsWith('@');
const str = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const q1 = (v: string) => `'${v.replace(/'/g, "'\\''")}'`;
const jstr = (v: string) => JSON.stringify(v);

export function sample(lang: Lang, i: SampleInput): string {
  const url = buildUrl(i);
  const m = i.method.toUpperCase();
  const isToken = i.path === '/oauth/token';
  const kind = bodyKind(i.headers);
  const headers: [string, string][] = [];
  if (!isToken) headers.push(['Authorization', 'DPoP $ANTON_ACCESS_TOKEN']);
  headers.push(['DPoP', '$DPOP_PROOF']);
  for (const [k, v] of Object.entries(i.headers || {})) {
    if (!v) continue;
    // a multipart Content-Type needs the boundary, which every client below writes itself
    if (kind === 'multipart' && /^content-type$/i.test(k)) continue;
    headers.push([k, v]);
  }
  const hasBody = i.body !== undefined && i.body !== null && !(typeof i.body === 'object' && Object.keys(i.body as object).length === 0 && m === 'GET');
  if (hasBody && kind === 'json' && !headers.some(([k]) => /^content-type$/i.test(k))) headers.push(['Content-Type', 'application/json']);
  const fields: [string, unknown][] = hasBody && kind !== 'json' && typeof i.body === 'object' ? Object.entries(i.body as Record<string, unknown>) : [];

  if (lang === 'curl') {
    // the URL gets its own line so the request reads top to bottom without scrolling sideways
    const lines = m === 'GET' ? [`curl ${url}`] : [`curl -X ${m}`, `  ${url}`];
    for (const [k, v] of headers) lines.push(`  -H "${k}: ${v}"`);
    if (hasBody) {
      if (kind === 'form') for (const [k, v] of fields) lines.push(`  -d ${k}=${str(v)}`);
      else if (kind === 'multipart') for (const [k, v] of fields) lines.push(isFile(v) ? `  -F ${k}=${v}` : `  -F ${k}=${q1(str(v))}`);
      else lines.push(`  -d '${json(i.body, 2)}'`);
    }
    return lines.join(' \\\n');
  }

  const env = (v: string) => v.replace(/\$([A-Z_]+)/g, (_, n) => `\${${n}}`);
  if (lang === 'node') {
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization' && v.startsWith('DPoP')) return `    Authorization: \`DPoP \${process.env.ANTON_ACCESS_TOKEN}\`,`;
        if (k === 'DPoP') return `    DPoP: await dpopProof('${m}', url), // fresh proof per request`;
        if (v.includes('$')) return `    '${k}': \`${v.replace(/\$([A-Z_]+)/g, (_, n) => `\${process.env.${n}}`)}\`,`;
        return `    '${k}': '${v}',`;
      })
      .join('\n');
    const pre: string[] = [`const url = '${url}';`];
    let body = '';
    if (hasBody && kind === 'form') {
      body = `,\n  body: new URLSearchParams(${json(Object.fromEntries(fields.map(([k, v]) => [k, str(v)])), 2)})`;
    } else if (hasBody && kind === 'multipart') {
      pre.push('// fetch writes the multipart Content-Type and boundary itself', 'const form = new FormData();');
      for (const [k, v] of fields) pre.push(isFile(v) ? `form.append('${k}', await fs.openAsBlob('${v.slice(1)}'), '${v.slice(1)}');` : `form.append('${k}', ${jstr(str(v))});`);
      body = ',\n  body: form';
    } else if (hasBody) body = `,\n  body: JSON.stringify(${json(i.body, 2)})`;
    return `${pre.join('\n')}\nconst res = await fetch(url, {\n  method: '${m}',\n  headers: {\n${h}\n  }${body},\n});\nconst data = await res.json();`;
  }

  if (lang === 'php') {
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization' && v.startsWith('DPoP')) return `        'Authorization' => 'DPoP ' . getenv('ANTON_ACCESS_TOKEN'),`;
        if (k === 'DPoP') return `        'DPoP' => dpop_proof('${m}', $url), // fresh proof per request`;
        const parts = v.split(/(\$[A-Z_]+)/).filter(Boolean).map((p) => (p.startsWith('$') ? `getenv('${p.slice(1)}')` : `'${p}'`));
        return `        '${k}' => ${parts.join(' . ')},`;
      })
      .join('\n');
    let body = '';
    if (hasBody && kind === 'form') body = `\n    'form_params' => ${phpArray(Object.fromEntries(fields.map(([k, v]) => [k, str(v)])), 4)},`;
    else if (hasBody && kind === 'multipart') {
      const parts = fields.map(([k, v]) => `        ['name' => '${k}', 'contents' => ${isFile(v) ? `fopen('${v.slice(1)}', 'r'), 'filename' => '${v.slice(1)}'` : phpArray(str(v), 8)}],`).join('\n');
      body = `\n    'multipart' => [\n${parts}\n    ],`;
    } else if (hasBody) body = `\n    'json' => ${phpArray(i.body, 4)},`;
    return `$url = '${url}';\n$response = (new GuzzleHttp\\Client())->request('${m}', $url, [\n    'headers' => [\n${h}\n    ],${body}\n]);\n$data = json_decode($response->getBody(), true);`;
  }

  if (lang === 'java') {
    // java.net.http (Java 11+); the JSON body is a text block (Java 15+)
    const h = headers
      .map(([k, v]) => {
        if (k === 'Authorization' && v.startsWith('DPoP')) return `    .header("Authorization", "DPoP " + token)`;
        if (k === 'DPoP') return `    // a fresh DPoP proof for every request\n    .header("DPoP", dpopProof("${m}", url))`;
        const parts = v.split(/(\$[A-Z_]+)/).filter(Boolean).map((p) => (p.startsWith('$') ? `System.getenv("${p.slice(1)}")` : jstr(p)));
        return `    .header("${k}", ${parts.join(' + ')})`;
      })
      .join('\n');
    const pre = [`var url = "${url}";`];
    if (headers.some(([k, v]) => k === 'Authorization' && v.startsWith('DPoP'))) pre.push('var token = System.getenv("ANTON_ACCESS_TOKEN");');
    let method = m === 'GET' ? '    .GET()' : `    .method("${m}", BodyPublishers.noBody())`;
    let extra = '';
    if (hasBody) {
      if (kind === 'form') {
        pre.push(`var body = ${jstr(fields.map(([k, v]) => `${k}=${encodeURIComponent(str(v))}`).join('&'))};`);
        method = `    .method("${m}", BodyPublishers.ofString(body))`;
      } else if (kind === 'multipart') {
        // java.net.http has no multipart builder: the parts are written out by hand
        pre.push('var boundary = "anton-" + UUID.randomUUID();', 'var parts = new ArrayList<byte[]>();');
        for (const [k, v] of fields) {
          if (isFile(v)) {
            pre.push(`parts.add(("--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"${k}\\"; filename=\\"${v.slice(1)}\\"\\r\\n\\r\\n").getBytes());`);
            pre.push(`parts.add(Files.readAllBytes(Path.of("${v.slice(1)}")));`, 'parts.add("\\r\\n".getBytes());');
          } else {
            pre.push(`parts.add(("--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"${k}\\"\\r\\n\\r\\n" + ${jstr(str(v))} + "\\r\\n").getBytes());`);
          }
        }
        pre.push('parts.add(("--" + boundary + "--\\r\\n").getBytes());');
        extra = '\n    .header("Content-Type", "multipart/form-data; boundary=" + boundary)';
        method = `    .method("${m}", BodyPublishers.ofByteArrays(parts))`;
      } else {
        const block = JSON.stringify(i.body, null, 2).split('\n').map((l) => '    ' + l).join('\n');
        pre.push(`var body = """\n${block}""";`);
        method = `    .method("${m}", BodyPublishers.ofString(body))`;
      }
    }
    return `${pre.join('\n')}\n\nvar request = HttpRequest.newBuilder(URI.create(url))\n${h}${extra}\n${method}\n    .build();\nvar response = HttpClient.newHttpClient()\n    .send(request, BodyHandlers.ofString());`;
  }

  // go
  const h = headers
    .map(([k, v]) => {
      if (k === 'Authorization' && v.startsWith('DPoP')) return `req.Header.Set("Authorization", "DPoP "+os.Getenv("ANTON_ACCESS_TOKEN"))`;
      if (k === 'DPoP') return `req.Header.Set("DPoP", dpopProof("${m}", url)) // fresh proof per request`;
      const parts = v.split(/(\$[A-Z_]+)/).filter(Boolean).map((p) => (p.startsWith('$') ? `os.Getenv("${p.slice(1)}")` : jstr(p)));
      return `req.Header.Set("${k}", ${parts.join('+')})`;
    })
    .join('\n');
  let body = '';
  let after = '';
  if (hasBody && kind === 'form') {
    const vals = fields.map(([k, v]) => `\t${jstr(k)}: {${jstr(str(v))}},`).join('\n');
    body = `form := url.Values{\n${vals}\n}\nbody := strings.NewReader(form.Encode())\n`;
  } else if (hasBody && kind === 'multipart') {
    const lines = ['var buf bytes.Buffer', 'mw := multipart.NewWriter(&buf)'];
    for (const [k, v] of fields) {
      if (isFile(v)) lines.push(`f, _ := os.Open(${jstr(v.slice(1))})`, `part, _ := mw.CreateFormFile(${jstr(k)}, ${jstr(v.slice(1))})`, 'io.Copy(part, f)');
      else lines.push(`mw.WriteField(${jstr(k)}, ${jstr(str(v))})`);
    }
    lines.push('mw.Close()');
    body = lines.join('\n') + '\nbody := &buf\n';
    after = '\nreq.Header.Set("Content-Type", mw.FormDataContentType())';
  } else if (hasBody) body = `body := strings.NewReader(\`${JSON.stringify(i.body, null, 2)}\`)\n`;
  const u = hasBody && kind === 'form' ? 'endpoint' : 'url';
  return `${u} := "${url}"\n${body}req, _ := http.NewRequest("${m}", ${u}, ${hasBody ? 'body' : 'nil'})\n${h.replace(/, url\)\)/g, `, ${u}))`)}${after}\nres, err := http.DefaultClient.Do(req)`;
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
