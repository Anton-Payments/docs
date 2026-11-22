/*
  Try mode's fields: what each input is, how it's checked, and the value it puts in the request.
  Pure, so the server builds the list and the browser checks it with the same rules.
*/

export type FormField = {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'json' | 'file' | 'secret';
  options?: string[];
  description?: string;
  type?: string;
  /** a decimal amount, sent as a string */
  decimal?: boolean;
  /** for a secret: the environment variable the code reads it from */
  envVar?: string;
};

/** The key a field's value is set under in the request: a body field by name, the rest as "$in.name". */
export const keyOf = (f: FormField) => (f.in === 'body' ? f.name : `$${f.in}.${f.name}`);

const DECIMAL_NAME = /(^|_)(amount|fee|rate|balance|total_debited)$/;
export const isDecimalName = (name: string) => DECIMAL_NAME.test(name);

/** A field that holds a credential is never typed into the page: the code reads it from the environment. */
export const isSecretName = (name: string) => /(secret|password|private_key)$/i.test(name);

/** What's wrong with a value, in a few words; null when it's fine. */
export function check(f: FormField, v: string): string | null {
  if (f.kind === 'secret') return null;
  if (!v) return f.required ? 'Required' : null;
  if (f.kind === 'json') {
    try {
      JSON.parse(v);
    } catch {
      return 'Not valid JSON';
    }
  }
  if (f.kind === 'number' && Number.isNaN(Number(v))) return 'A number';
  if (f.kind === 'enum' && f.options?.length && !f.options.includes(v)) return `One of ${f.options.join(', ')}`;
  if (f.decimal && !/^\d+(\.\d+)?$/.test(v)) return 'A decimal string, like 500.00';
  return null;
}

/** The value a field puts in the request; null leaves it out. */
export function value(f: FormField, v: string): unknown {
  if (!v) return null;
  // a secret is either left out or written as the environment variable the code reads it from
  if (f.kind === 'secret') return `$${f.envVar}`;
  if (f.kind === 'json') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  if (f.kind === 'number') return Number(v);
  if (f.kind === 'boolean') return v === 'true';
  if (f.kind === 'file') return `@${v}`;
  return v;
}

/** A request value as the text an input shows. */
export function display(f: FormField, v: unknown): string {
  if (v === undefined || v === null) return '';
  if (f.kind === 'secret') return 'on';
  if (f.kind === 'file' && typeof v === 'string') return v.replace(/^@/, '');
  if (f.kind === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  return String(v);
}
