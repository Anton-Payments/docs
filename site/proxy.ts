import { NextResponse, type NextRequest } from 'next/server';

/*
  /mcp is two things at one address: the page people read about connecting an AI tool, and the
  MCP server itself. MCP clients POST, or GET asking for an event stream; any other GET or HEAD
  (a browser, a link checker, a link preview) gets the page.
*/
export function proxy(req: NextRequest) {
  const read = req.method === 'GET' || req.method === 'HEAD';
  const wantsPage = read && !(req.headers.get('accept') || '').includes('text/event-stream');
  if (wantsPage) return NextResponse.next();
  return NextResponse.rewrite(new URL('/api/mcp', req.url));
}

export const config = { matcher: ['/mcp'] };
