import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Public endpoint — returns active course tags for the review page
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, description
      FROM course_tags
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Course tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
