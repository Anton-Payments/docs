import { flatten, type Parameter, type Schema } from '@/lib/openapi';
import { Md } from './markdown';

function typeLabel(s: Schema | undefined): string {
  const f = flatten(s);
  if (!f) return 'any';
  if (f.oneOf?.length) return f.oneOf.map(typeLabel).join(' | ');
  if (f.anyOf?.length) return f.anyOf.map(typeLabel).join(' | ');
  let t = Array.isArray(f.type) ? f.type.filter((x) => x !== 'null').join(' | ') : f.type || (f.properties ? 'object' : 'any');
  if (t === 'array') t = `array of ${typeLabel(f.items)}`;
  if (t === 'string' && f.format) t = `string (${f.format})`;
  const nullable = f.nullable || (Array.isArray(f.type) && f.type.includes('null'));
  return nullable ? `${t} | null` : t;
}

function children(s: Schema | undefined): Schema | undefined {
  const f = flatten(s);
  if (!f) return undefined;
  if (f.properties && Object.keys(f.properties).length) return f;
  if (f.items) {
    const i = flatten(f.items);
    if (i?.properties && Object.keys(i.properties).length) return i;
  }
  return undefined;
}

function Field({ name, schema, required, depth }: { name: string; schema: Schema; required?: boolean; depth: number }) {
  const f = flatten(schema)!;
  const kids = depth < 4 ? children(f) : undefined;
  const isDecimal = f.type === 'string' && /(^|_)(amount|fee|rate|balance|total_debited)$/.test(name);
  return (
    <div className="param">
      <div className="n">
        <code className="fname">{name}</code>
        <span className="t">
          {isDecimal && !f.format ? 'decimal string' : typeLabel(f)}
          {required && <> · <em>required</em></>}
          {f.readOnly && ' · read-only'}
          {f.deprecated && ' · deprecated'}
        </span>
      </div>
      <div className="pd">
        <Md>{f.description}</Md>
        {f.enum && f.enum.length > 0 && (
          <div className="enum">{f.enum.filter((e) => e !== null).map((e) => <code key={String(e)}>{String(e)}</code>)}</div>
        )}
        {f.example !== undefined && typeof f.example !== 'object' && !f.enum && (
          <div style={{ fontSize: 12, marginTop: 4 }}>Example: <code style={{ fontFamily: 'var(--mono)' }}>{typeof f.example === 'string' ? `"${f.example}"` : String(f.example)}</code></div>
        )}
        {kids && (
          <details>
            <summary>{f.items ? 'Item fields' : 'Fields'} ({Object.keys(kids.properties!).length})</summary>
            <Fields schema={kids} depth={depth + 1} />
          </details>
        )}
      </div>
    </div>
  );
}

export function Fields({ schema, depth = 0, hideReadOnly }: { schema: Schema; depth?: number; hideReadOnly?: boolean }) {
  const f = flatten(schema);
  if (!f?.properties) return null;
  const req = new Set(f.required || []);
  const entries = Object.entries(f.properties).filter(([, v]) => !(hideReadOnly && v.readOnly));
  entries.sort(([a], [b]) => Number(req.has(b)) - Number(req.has(a)));
  return (
    <div className="params">
      {entries.map(([k, v]) => (
        <Field key={k} name={k} schema={v} required={req.has(k)} depth={depth} />
      ))}
    </div>
  );
}

export function ParamTable({ params }: { params: Parameter[] }) {
  return (
    <div className="params">
      {params.map((p) => (
        <Field key={p.in + p.name} name={p.name} schema={{ ...(p.schema || {}), description: p.description || p.schema?.description, example: p.example ?? p.schema?.example }} required={p.required} depth={0} />
      ))}
    </div>
  );
}
