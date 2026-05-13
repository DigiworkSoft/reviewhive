import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { loadAutoReplyConfig, runAutoReply } from '@/lib/auto-reply-engine';

// POST /api/admin/auto-reply/run — manual trigger (admin-authenticated via middleware)
export async function POST() {
  try {
    const config = await loadAutoReplyConfig();

    if (config.autoreply_enabled !== 'true') {
      return NextResponse.json(
        { error: 'Auto-reply is disabled. Enable it in settings first.' },
        { status: 400 },
      );
    }

    const result = await runAutoReply(config);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Manual auto-reply run error:', error);

    try {
      const errMsg = `Manual run FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await sql`
        INSERT INTO config_audit_log (config_key, old_value, new_value)
        VALUES ('autoreply_last_cron_run', NULL, ${errMsg})
      `;
    } catch { /* ignore logging failure */ }

    return NextResponse.json(
      { error: 'Auto-reply run failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
