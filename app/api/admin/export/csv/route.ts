import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to query params required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const lines: string[] = [];

    // ── Section 1: Overall KPIs ─────────────────────────────────────────
    const kpiRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'scan')::int AS total_scans,
        COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS reviews_posted,
        ROUND(COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE event_type = 'scan'), 0), 1) AS conversion_rate,
        COALESCE(ROUND(AVG(star_rating) FILTER (WHERE event_type = 'post_on_google_clicked' AND star_rating IS NOT NULL)::numeric, 1), 0) AS avg_rating,
        COUNT(*) FILTER (WHERE event_type = 'negative_feedback')::int AS negative_feedback
      FROM review_events
      WHERE created_at >= ${from}::date AND created_at < (${to}::date + INTERVAL '1 day')
    `;
    const k = kpiRows[0];

    lines.push('OVERALL SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total QR Scans,${k.total_scans}`);
    lines.push(`Reviews Posted,${k.reviews_posted}`);
    lines.push(`Conversion Rate,${k.conversion_rate ?? 0}%`);
    lines.push(`Average Star Rating,${k.avg_rating}`);
    lines.push(`Negative Feedback,${k.negative_feedback}`);
    lines.push('');

    // ── Section 2: Course Breakdown ─────────────────────────────────────
    const courses = await sql`
      SELECT ct.name,
        COUNT(*) FILTER (WHERE re.event_type = 'course_selected')::int AS scans,
        COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked')::int AS reviews,
        ROUND(COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE re.event_type = 'course_selected'), 0), 1) AS conversion_rate,
        COALESCE(ROUND(AVG(re.star_rating) FILTER (WHERE re.event_type = 'post_on_google_clicked' AND re.star_rating IS NOT NULL)::numeric, 1), 0) AS avg_rating
      FROM review_events re JOIN course_tags ct ON re.course_tag_id = ct.id
      WHERE re.created_at >= ${from}::date AND re.created_at < (${to}::date + INTERVAL '1 day')
      GROUP BY ct.id, ct.name ORDER BY reviews DESC
    `;

    lines.push('COURSE BREAKDOWN');
    lines.push('Course,Scans,Reviews,Conversion Rate,Avg Rating');
    for (const c of courses) {
      lines.push(`"${c.name}",${c.scans},${c.reviews},${c.conversion_rate ?? 0}%,${c.avg_rating}`);
    }
    lines.push('');

    // ── Section 3: Rating Distribution ──────────────────────────────────
    const ratings = await sql`
      SELECT star_rating, COUNT(*)::int AS count
      FROM review_events
      WHERE event_type = 'post_on_google_clicked' AND star_rating BETWEEN 1 AND 5
        AND created_at >= ${from}::date AND created_at < (${to}::date + INTERVAL '1 day')
      GROUP BY star_rating ORDER BY star_rating
    `;

    lines.push('RATING DISTRIBUTION');
    lines.push('Stars,Reviews');
    for (const r of ratings) {
      lines.push(`${r.star_rating} star${r.star_rating > 1 ? 's' : ''},${r.count}`);
    }
    lines.push('');

    // ── Section 4: Course-wise Star Rating ──────────────────────────────
    const courseRatings = await sql`
      SELECT ct.name AS course, re.star_rating, COUNT(*)::int AS count
      FROM review_events re JOIN course_tags ct ON re.course_tag_id = ct.id
      WHERE re.event_type = 'post_on_google_clicked' AND re.star_rating BETWEEN 1 AND 5
        AND re.created_at >= ${from}::date AND re.created_at < (${to}::date + INTERVAL '1 day')
      GROUP BY ct.name, re.star_rating ORDER BY ct.name, re.star_rating
    `;

    lines.push('COURSE-WISE STAR RATINGS');
    lines.push('Course,Stars,Reviews');
    for (const cr of courseRatings) {
      lines.push(`"${cr.course}",${cr.star_rating} star${cr.star_rating > 1 ? 's' : ''},${cr.count}`);
    }
    lines.push('');

    // ── Section 5: Daily Trend ──────────────────────────────────────────
    const daily = await sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE event_type = 'scan')::int AS scans,
        COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS reviews
      FROM review_events
      WHERE created_at >= ${from}::date AND created_at < (${to}::date + INTERVAL '1 day')
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
      ORDER BY date
    `;

    lines.push('DAILY TREND');
    lines.push('Date,Scans,Reviews');
    for (const d of daily) {
      lines.push(`${d.date},${d.scans},${d.reviews}`);
    }

    const csv = lines.join('\n') + '\n';
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvBytes = encoder.encode(csv);
    const output = new Uint8Array(bom.length + csvBytes.length);
    output.set(bom, 0);
    output.set(csvBytes, bom.length);
    const today = new Date().toISOString().split('T')[0];
    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reviews-export-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}