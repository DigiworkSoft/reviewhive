import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(request: NextRequest) {
  try {
    // Basic auth check
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let email = '';
    let adminId = '';
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      email = payload.email as string;
      adminId = payload.sub as string;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Invalid input. Password must be 8+ characters.' }, { status: 400 });
    }

    // Verify current password
    const users = await sql`SELECT password_hash FROM admin_users WHERE id = ${adminId}`;
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 403 });
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE admin_users 
      SET password_hash = ${newHash}, refresh_token_hash = NULL 
      WHERE id = ${adminId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
