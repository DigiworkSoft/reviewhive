import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET!);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and auth API without authentication
  if (pathname === '/admin/login' || pathname === '/api/admin/auth') {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('session')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // ── Try access token first ─────────────────────────────────────────────
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      return NextResponse.next(); // Valid access token — proceed
    } catch {
      // Access token expired or invalid — try refresh below
    }
  }

  // ── Try refresh token to issue new access token ────────────────────────
  if (refreshToken) {
    try {
      const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET);

      // Issue a new 1-hour access token
      const newAccessToken = await new SignJWT({ sub: payload.sub, email: payload.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      const response = NextResponse.next();
      response.cookies.set('session', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      });
      return response; // Silently refreshed — proceed
    } catch {
      // Refresh token also expired or invalid — force re-login
    }
  }

  // ── No valid tokens — redirect to login ────────────────────────────────
  const response = NextResponse.redirect(new URL('/admin/login', request.url));
  response.cookies.delete('session');
  response.cookies.delete('refresh_token');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/qr/:path*'],
};
