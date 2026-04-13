import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT account_name, location_name, location_title, connected_at, expires_at
      FROM google_tokens LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const token = rows[0];
    return NextResponse.json({
      connected: true,
      account_name: token.account_name,
      location_name: token.location_name,
      location_title: token.location_title,
      connected_at: token.connected_at,
    });
  } catch (error) {
    console.error('Google status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
