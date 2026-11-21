/*
  Linked text and code. A highlighted sample is split into lines that stand alone (a string that
  spans lines is closed and reopened at each break), and every line is indexed by the names and
  values it carries, so a field named in the prose can find its line in any language.
*/

/** Split highlighted HTML into lines, closing and reopening any span that crosses a break. */
export function splitHtmlLines(html: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  let line = '';
  for (const part of html.split(/(<[^>]+>|\n)/)) {
    if (!part) continue;
    if (part === '\n') {
      out.push(line + '</span>'.repeat(open.length));
      line = open.join('');
      continue;
    }
    if (part.startsWith('</')) open.pop();
    else if (part.startsWith('<') && !part.endsWith('/>')) open.push(part);
    line += part;
  }
  out.push(line + '</span>'.repeat(open.length));
  return out;
}

const decode = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The tokens a line carries: quoted keys and values, and both halves of a "Header: value" string. */
export function lineTokens(text: string): string[] {
  const t = new Set<string>();
  for (const m of text.matchAll(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g)) {
    const s = (m[1] ?? m[2] ?? '').trim();
    if (!s) continue;
    const hv = s.match(/^([A-Za-z][\w-]*):\s+(.+)$/);
    if (hv) { t.add(hv[1]); t.add(hv[2]); } else t.add(s);
  }
  return [...t].filter((x) => x.length > 2 && !/\s/.test(x));
}

export type LineIndex = Map<string, number[]>;

export function indexLines(lines: string[]): LineIndex {
  const idx: LineIndex = new Map();
  lines.forEach((l, i) => {
    for (const tok of lineTokens(decode(l))) {
      const a = idx.get(tok) || [];
      a.push(i);
      idx.set(tok, a);
    }
  });
  return idx;
}

/** What an inline code span in the prose refers to: `fixed_side`, or the key of `fixed_side: "x"`. */
export function proseTokens(text: string): string[] {
  const s = text.trim();
  const kv = s.match(/^([A-Za-z_][\w-]*)\s*:\s*"?([^"]*)"?$/);
  if (kv) return [kv[1], kv[2]].filter(Boolean);
  return [s];
}
