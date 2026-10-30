/** Only used where no proxy sits in front of the web app, like the laptop. */
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  // Read per request, not in next.config rewrites: those freeze the address at build time.
  return NextResponse.rewrite(new URL(`${pathname}${search}`, process.env.API_URL));
}

export const config = { matcher: '/api/:path*' };
