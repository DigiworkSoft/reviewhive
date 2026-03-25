import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendWeeklyDigest } from '@/lib/email';

export async function GET(request: NextRequest) {
  // ── Auth check — MUST be first ──────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ── Query last 7 days ─────────────────────────────────────────────────
    const statsRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'scan')::int AS total_scans,
        COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS reviews_posted,
        ROUND(
          COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE event_type = 'scan'), 0), 1
        ) AS conversion_rate,
        COALESCE(ROUND(AVG(star_rating) FILTER (
          WHERE event_type = 'post_on_google_clicked' AND star_rating IS NOT NULL
        )::numeric, 1), 0) AS avg_rating,
        COUNT(*) FILTER (WHERE event_type = 'negative_feedback')::int AS negative_count
      FROM review_events
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;

    const topCourseRows = await sql`
      SELECT ct.name, COUNT(*)::int AS count
      FROM review_events re
      JOIN course_tags ct ON re.course_tag_id = ct.id
      WHERE re.event_type = 'post_on_google_clicked'
        AND re.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY ct.id, ct.name
      ORDER BY count DESC
      LIMIT 1
    `;

    // ── Get admin email ───────────────────────────────────────────────────
    const emailRows = await sql`
      SELECT value FROM system_config WHERE key = 'admin_email'
    `;
    const adminEmail = emailRows[0]?.value || process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: 'No admin email configured' }, { status: 500 });
    }

    // ── Format dates ──────────────────────────────────────────────────────
    const now = new Date();
    const weekEnd = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const weekStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = weekStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const s = statsRows[0];
    await sendWeeklyDigest({
      weekStart,
      weekEnd,
      totalScans: s.total_scans,
      reviewsPosted: s.reviews_posted,
      conversionRate: Number(s.conversion_rate ?? 0),
      avgRating: Number(s.avg_rating),
      topCourse: topCourseRows[0]?.name || 'N/A',
      negativeFeedbackCount: s.negative_count,
    }, adminEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Weekly digest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
