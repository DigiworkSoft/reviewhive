import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if admin exists
    const users = await sql`SELECT id FROM admin_users WHERE email = ${email}`;
    if (users.length === 0) {
      // Return 200 anyway to prevent email enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }
    const adminId = users[0].id;

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create reset link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000';
    const resetLink = `${baseUrl}/admin/reset-password?token=${token}`;

    // Calculate expiration (15 mins)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store hashed token
    await sql`
      INSERT INTO password_reset_tokens (admin_id, token_hash, expires_at)
      VALUES (${adminId}, ${tokenHash}, ${expiresAt})
    `;

    // Send email
    await sendPasswordResetEmail(email, resetLink);

    return NextResponse.json({ success: true, message: 'Password reset link sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
