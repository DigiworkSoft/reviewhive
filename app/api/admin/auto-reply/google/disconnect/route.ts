import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST() {
  try {
    await sql`DELETE FROM google_tokens`;
    return NextResponse.json({ success: true, message: 'Google account disconnected' });
  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
