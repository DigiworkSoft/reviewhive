import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';
import { comparePassword, signJwt, signRefreshToken } from '@/lib/auth';
import crypto from 'crypto';

// ── In-memory rate limiting ────────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const failedLogins = new Map<string, { count: number; firstFailure: number; lockedUntil?: number }>();

function getIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1';
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ipHash);
  if (!entry) return false;
  // 10 attempts per 15 minutes
  if (now - entry.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ipHash);
    return false;
  }
  return entry.count >= 10;
}

function recordAttempt(ipHash: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ipHash);
  if (!entry || now - entry.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.set(ipHash, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}

function isLockedOut(email: string): boolean {
  const now = Date.now();
  const entry = failedLogins.get(email);
  if (!entry) return false;
  if (entry.lockedUntil && now < entry.lockedUntil) return true;
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    failedLogins.delete(email);
    return false;
  }
  return false;
}

function recordFailedLogin(email: string): void {
  const now = Date.now();
  const entry = failedLogins.get(email);
  if (!entry || now - entry.firstFailure > 10 * 60 * 1000) {
    failedLogins.set(email, { count: 1, firstFailure: now });
  } else {
    entry.count++;
    if (entry.count >= 5) {
      entry.lockedUntil = now + 30 * 60 * 1000; // 30-minute lock
    }
  }
}

function clearFailedLogins(email: string): void {
  failedLogins.delete(email);
}

// ── Schemas ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  action: z.literal('login'),
  email: z.email(),
  password: z.string().min(1),
});

const logoutSchema = z.object({
  action: z.literal('logout'),
});

const requestSchema = z.union([loginSchema, logoutSchema]);

// ── POST handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === 'logout') {
      const response = NextResponse.json({ message: 'Logged out' });
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    // ── Login flow ─────────────────────────────────────────────────────────
    const ipHash = getIpHash(request);

    // Check IP rate limit
    if (isRateLimited(ipHash)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    recordAttempt(ipHash);

    // Check account lockout
    if (isLockedOut(data.email)) {
      return NextResponse.json(
        { error: 'Account is locked due to too many failed attempts. Please try again in 30 minutes.' },
        { status: 423 }
      );
    }

    // Find admin user
    const users = await sql`SELECT id, email, password_hash FROM admin_users WHERE email = ${data.email}`;
    if (users.length === 0) {
      recordFailedLogin(data.email);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];

    // Verify password
    const valid = await comparePassword(data.password, user.password_hash);
    if (!valid) {
      recordFailedLogin(data.email);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Clear failed login tracking on success
    clearFailedLogins(data.email);

    // Generate JWT (1 hour)
    const jwt = await signJwt({ sub: user.id, email: user.email });

    // Generate refresh token (7 days)
    const refreshToken = await signRefreshToken({ sub: user.id, email: user.email });

    // Update last login
    await sql`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}`;

    // Set httpOnly cookies
    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
    });

    response.cookies.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
