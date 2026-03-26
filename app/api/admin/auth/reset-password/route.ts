import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Find valid token
    const tokens = await sql`
      SELECT admin_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used = false
    `;

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const adminId = tokens[0].admin_id;

    // 2. Update password
    const passwordHash = await bcrypt.hash(password, 10);
    await sql`
      UPDATE admin_users SET password_hash = ${passwordHash} WHERE id = ${adminId}
    `;

    // 3. Mark token as used
    await sql`
      UPDATE password_reset_tokens SET used = true WHERE admin_id = ${adminId}
    `;

    return NextResponse.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
