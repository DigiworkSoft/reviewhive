import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { loadAutoReplyConfig, runAutoReply } from '@/lib/auto-reply-engine';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await loadAutoReplyConfig();

    // Check if auto-reply is enabled
    if (config.autoreply_enabled !== 'true') {
      return NextResponse.json({ skipped: true, reason: 'Auto-reply is disabled' });
    }

    // Check interval — skip if not enough time has passed
    const interval = parseInt(config.autoreply_cron_interval || '60') * 60 * 1000;
    const lastRun = config.autoreply_last_cron_run
      ? new Date(config.autoreply_last_cron_run).getTime()
      : 0;

    if (Date.now() - lastRun < interval) {
      return NextResponse.json({ skipped: true, reason: 'Too soon since last run' });
    }

    const result = await runAutoReply(config);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron auto-reply error:', error);

    // Log failure to audit log (best-effort)
    try {
      const errMsg = `Cron FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await sql`
        INSERT INTO config_audit_log (config_key, old_value, new_value)
        VALUES ('autoreply_last_cron_run', NULL, ${errMsg})
      `;
    } catch { /* ignore logging failure */ }

    return NextResponse.json(
      { error: 'Cron failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
