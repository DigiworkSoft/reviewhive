import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import sql from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Check if user exists
    const admins = await sql`SELECT id FROM admin_users WHERE email = ${email}`;
    if (admins.length === 0) {
      // For security, don't reveal if user exists. Just say "If email exists..."
      return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const adminId = admins[0].id;

    // 2. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Save token
    await sql`
      INSERT INTO password_reset_tokens (admin_id, token_hash, expires_at)
      VALUES (${adminId}, ${tokenHash}, ${expiresAt})
    `;

    // 4. Send Email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/admin/reset-password?token=${token}`;
    console.log(`🔗 RESET LINK GENERATED: ${resetLink}`);

    await sendPasswordResetEmail(email, resetLink);

    return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
