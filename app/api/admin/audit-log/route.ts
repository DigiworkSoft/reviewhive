import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const perPage = 30;
    const offset = (page - 1) * perPage;

    const totalRows = await sql`SELECT COUNT(*)::int AS count FROM config_audit_log`;
    const total = totalRows[0].count;
    const totalPages = Math.ceil(total / perPage) || 1;

    const rows = await sql`
      SELECT id, config_key, old_value, new_value, changed_at
      FROM config_audit_log
      ORDER BY changed_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    return NextResponse.json({ rows, total, page, totalPages });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
