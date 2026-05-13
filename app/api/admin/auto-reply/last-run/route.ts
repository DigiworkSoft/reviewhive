import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/admin/auto-reply/last-run — return last cron run info
export async function GET() {
  try {
    const configRow = await sql`
      SELECT value FROM system_config WHERE key = 'autoreply_last_cron_run' LIMIT 1
    `;

    const auditRow = await sql`
      SELECT new_value, changed_at FROM config_audit_log
      WHERE config_key = 'autoreply_last_cron_run'
      ORDER BY changed_at DESC LIMIT 1
    `;

    return NextResponse.json({
      last_run: configRow.length > 0 ? configRow[0].value : null,
      last_result: auditRow.length > 0 ? auditRow[0].new_value : null,
    });
  } catch (error) {
    console.error('Last run fetch error:', error);
    return NextResponse.json({ last_run: null, last_result: null });
  }
}
