import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = payload.sub as string;

    const admins = await sql`SELECT email FROM admin_users WHERE id = ${adminId}`;
    if (admins.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ email: admins[0].email });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = payload.sub as string;

    const { email, currentPassword, newPassword } = await request.json();

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Verify current password
    const admins = await sql`SELECT password_hash FROM admin_users WHERE id = ${adminId}`;
    if (admins.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, admins[0].password_hash);
    if (!isValid) return NextResponse.json({ error: 'Incorrect current password' }, { status: 403 });

    // Update logic
    if (newPassword) {
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be 8+ chars' }, { status: 400 });
      const newHash = await bcrypt.hash(newPassword, 10);
      await sql`
        UPDATE admin_users 
        SET email = ${email}, password_hash = ${newHash}, refresh_token_hash = NULL 
        WHERE id = ${adminId}
      `;
    } else {
      await sql`
        UPDATE admin_users SET email = ${email} WHERE id = ${adminId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
