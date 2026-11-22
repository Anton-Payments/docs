import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-static';

export function GET() {
  const body = fs.readFileSync(path.resolve(process.cwd(), '..', 'openapi-merchant.yaml'), 'utf8');
  return new Response(body, { headers: { 'Content-Type': 'application/yaml; charset=utf-8' } });
}
