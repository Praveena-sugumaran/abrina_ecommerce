import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Since original React app used localStorage for tokens, Next.js Edge Middleware
  // cannot reliably intercept them unless they are moved to Cookies.
  // We provide a shell middleware to preserve the flow and allow future cookie-based auth migrations.
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Example basic protection (if token was a cookie):
  // if (!token && pathname.startsWith('/admin')) {
  //   return NextResponse.redirect(new URL('/admin/login', request.url));
  // }

  return NextResponse.next();
}

// Specify routes for middleware
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/buyer/dashboard/:path*', '/supplier/dashboard/:path*'],
};
