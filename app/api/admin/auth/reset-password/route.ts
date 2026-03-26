import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();
    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Valid token and password (min 8 chars) required' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokens = await sql`
      SELECT id, admin_id 
      FROM password_reset_tokens 
      WHERE token_hash = ${tokenHash}
        AND used = false 
        AND expires_at > NOW()
    `;

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const { id: tokenId, admin_id } = tokens[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password, mark token used, invalidate all refresh tokens
    await Promise.all([
      sql`
        UPDATE admin_users 
        SET password_hash = ${passwordHash}, refresh_token_hash = NULL 
        WHERE id = ${admin_id}
      `,
      sql`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE id = ${tokenId}
      `
    ]);

    return NextResponse.json({ success: true, message: 'Password reset completely.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
