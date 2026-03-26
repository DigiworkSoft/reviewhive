import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const range = searchParams.get('range') || '30';
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const courseFilter = searchParams.get('course') || null;

    // Build date filter
    let dateFilter = `NOW() - INTERVAL '${parseInt(range, 10)} days'`;
    if (startDate && endDate) {
      dateFilter = `'${startDate}'::timestamptz`;
    }

    // ── KPI ─────────────────────────────────────────────────────────────
    if (type === 'kpi') {
      const days = parseInt(range, 10) || 30;
      const scansResult = startDate && endDate
        ? await sql`
            SELECT COUNT(*)::int AS count FROM review_events
            WHERE event_type = 'scan'
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
          `
        : await sql`
            SELECT COUNT(*)::int AS count FROM review_events
            WHERE event_type = 'scan' AND created_at >= NOW() - ${days + ' days'}::interval
          `;
      const reviewsResult = startDate && endDate
        ? await sql`
            SELECT COUNT(*)::int AS count FROM review_events
            WHERE event_type = 'post_on_google_clicked'
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
          `
        : await sql`
            SELECT COUNT(*)::int AS count FROM review_events
            WHERE event_type = 'post_on_google_clicked' AND created_at >= NOW() - ${days + ' days'}::interval
          `;
      const avgResult = startDate && endDate
        ? await sql`
            SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
            FROM review_events WHERE event_type = 'post_on_google_clicked' AND star_rating IN (4, 5)
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
          `
        : await sql`
            SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
            FROM review_events WHERE event_type = 'post_on_google_clicked' AND star_rating IN (4, 5)
              AND created_at >= NOW() - ${days + ' days'}::interval
          `;
      const totalScans = scansResult[0].count;
      const totalReviews = reviewsResult[0].count;
      const avgRating = Number(avgResult[0].avg);
      const conversionRate = totalScans > 0
        ? Math.round((totalReviews / totalScans) * 1000) / 10
        : 0;

      return NextResponse.json({
        total_scans: totalScans,
        total_reviews_posted: totalReviews,
        conversion_rate: conversionRate,
        avg_star_rating: avgRating,
      });
    }

    // ── KPI for previous month (for delta calculation) ──────────────────
    if (type === 'kpi_prev') {
      const scans = await sql`
        SELECT COUNT(*)::int AS count FROM review_events
        WHERE event_type = 'scan'
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
          AND created_at < DATE_TRUNC('month', NOW())
      `;
      const reviews = await sql`
        SELECT COUNT(*)::int AS count FROM review_events
        WHERE event_type = 'post_on_google_clicked'
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
          AND created_at < DATE_TRUNC('month', NOW())
      `;
      const avg = await sql`
        SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
        FROM review_events
        WHERE event_type = 'rating_submitted' AND star_rating IN (4, 5)
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
          AND created_at < DATE_TRUNC('month', NOW())
      `;
      const s = scans[0].count;
      const r = reviews[0].count;
      return NextResponse.json({
        total_scans: s,
        total_reviews_posted: r,
        conversion_rate: s > 0 ? Math.round((r / s) * 1000) / 10 : 0,
        avg_star_rating: Number(avg[0].avg),
      });
    }

    // ── Trend: daily scans + conversions ─────────────────────────────────
    if (type === 'trend') {
      const days = parseInt(range, 10) || 30;
      const rows = startDate && endDate
        ? await sql`
            SELECT
              DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS date,
              COUNT(*) FILTER (WHERE event_type = 'scan')::int AS scans,
              COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS conversions
            FROM review_events
            WHERE created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
            GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
            ORDER BY date ASC
          `
        : await sql`
            SELECT
              DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS date,
              COUNT(*) FILTER (WHERE event_type = 'scan')::int AS scans,
              COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS conversions
            FROM review_events
            WHERE created_at >= NOW() - ${days + ' days'}::interval
            GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
            ORDER BY date ASC
          `;
      return NextResponse.json(rows);
    }

    // ── Weekly: volume per week (last 12 weeks) ──────────────────────────
    if (type === 'weekly') {
      const rows = await sql`
        SELECT
          DATE_TRUNC('week', created_at AT TIME ZONE 'Asia/Kolkata')::date AS week_start,
          COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS reviews
        FROM review_events
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', created_at AT TIME ZONE 'Asia/Kolkata')
        ORDER BY week_start ASC
      `;
      return NextResponse.json(rows);
    }

    // ── Courses: breakdown per course tag ─────────────────────────────────
    if (type === 'courses') {
      const days = parseInt(range, 10) || 30;
      const rows = startDate && endDate
        ? await sql`
            SELECT
              ct.name AS course_name,
              COUNT(*) FILTER (WHERE re.event_type = 'course_selected')::int AS scans,
              COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked')::int AS reviews_posted,
              ROUND(
                COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked') * 100.0
                / NULLIF(COUNT(*) FILTER (WHERE re.event_type = 'course_selected'), 0), 1
              ) AS conversion_rate
            FROM review_events re
            JOIN course_tags ct ON re.course_tag_id = ct.id
            WHERE re.created_at >= ${startDate}::timestamptz AND re.created_at < ${endDate}::timestamptz + INTERVAL '1 day'
            GROUP BY ct.id, ct.name
            ORDER BY conversion_rate DESC NULLS LAST
          `
        : await sql`
            SELECT
              ct.name AS course_name,
              COUNT(*) FILTER (WHERE re.event_type = 'course_selected')::int AS scans,
              COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked')::int AS reviews_posted,
              ROUND(
                COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked') * 100.0
                / NULLIF(COUNT(*) FILTER (WHERE re.event_type = 'course_selected'), 0), 1
              ) AS conversion_rate
            FROM review_events re
            JOIN course_tags ct ON re.course_tag_id = ct.id
            WHERE re.created_at >= NOW() - ${days + ' days'}::interval
            GROUP BY ct.id, ct.name
            ORDER BY conversion_rate DESC NULLS LAST
          `;
      return NextResponse.json(rows);
    }

    // ── Ratings: distribution of all submitted ratings ─────────────────────
    if (type === 'ratings') {
      const days = parseInt(range, 10) || 30;
      const ratingRows = startDate && endDate
        ? await sql`
            SELECT star_rating, COUNT(*)::int AS count
            FROM review_events
            WHERE event_type = 'rating_submitted' AND star_rating BETWEEN 1 AND 5
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
            GROUP BY star_rating
            ORDER BY star_rating ASC
          `
        : await sql`
            SELECT star_rating, COUNT(*)::int AS count
            FROM review_events
            WHERE event_type = 'rating_submitted' AND star_rating BETWEEN 1 AND 5
              AND created_at >= NOW() - ${days + ' days'}::interval
            GROUP BY star_rating
            ORDER BY star_rating ASC
          `;
      const negativeRows = startDate && endDate
        ? await sql`
            SELECT COUNT(*)::int AS count
            FROM review_events
            WHERE event_type = 'negative_feedback'
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
          `
        : await sql`
            SELECT COUNT(*)::int AS count
            FROM review_events
            WHERE event_type = 'negative_feedback'
              AND created_at >= NOW() - ${days + ' days'}::interval
          `;
      const avgRow = startDate && endDate
        ? await sql`
            SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
            FROM review_events
            WHERE event_type = 'rating_submitted' AND star_rating BETWEEN 1 AND 5
              AND created_at >= ${startDate}::timestamptz AND created_at < ${endDate}::timestamptz + INTERVAL '1 day'
          `
        : await sql`
            SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
            FROM review_events
            WHERE event_type = 'rating_submitted' AND star_rating BETWEEN 1 AND 5
              AND created_at >= NOW() - ${days + ' days'}::interval
          `;
      return NextResponse.json({
        ratings: ratingRows,
        negative_count: negativeRows[0].count,
        avg_rating: Number(avgRow[0].avg),
      });
    }

    // ── Feed: paginated activity feed (session-based) ─────────────────────
    if (type === 'feed') {
      const limit = 50;
      const offset = (page - 1) * limit;

      const countQuery = courseFilter
        ? await sql`
            SELECT COUNT(DISTINCT session_id)::int AS total FROM review_events
            WHERE event_type IN ('ai_generated', 'fallback_used', 'negative_feedback')
              AND course_tag_id = ${courseFilter}
          `
        : await sql`
            SELECT COUNT(DISTINCT session_id)::int AS total FROM review_events
            WHERE event_type IN ('ai_generated', 'fallback_used', 'negative_feedback')
          `;

      const rows = courseFilter
        ? await sql`
            SELECT
              MAX(re.created_at) AS created_at,
              MAX(ct.name) AS course_name,
              MAX(re.star_rating) AS star_rating,
              CASE
                WHEN BOOL_OR(re.event_type = 'ai_generated') THEN 'AI'
                WHEN BOOL_OR(re.event_type = 'fallback_used') THEN 'Fallback Template'
                ELSE 'Negative Feedback'
              END AS review_source,
              CASE
                WHEN BOOL_OR(re.event_type = 'post_on_google_clicked') THEN 'Review Posted'
                WHEN BOOL_OR(re.event_type = 'negative_feedback') THEN 'Redirected to WhatsApp'
                ELSE 'Incomplete'
              END AS status
            FROM review_events re
            LEFT JOIN course_tags ct ON re.course_tag_id = ct.id
            WHERE re.session_id IN (
              SELECT DISTINCT session_id FROM review_events
              WHERE event_type IN ('ai_generated', 'fallback_used', 'negative_feedback')
                AND course_tag_id = ${courseFilter}
            )
            GROUP BY re.session_id
            ORDER BY MAX(re.created_at) DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await sql`
            SELECT
              MAX(re.created_at) AS created_at,
              MAX(ct.name) AS course_name,
              MAX(re.star_rating) AS star_rating,
              CASE
                WHEN BOOL_OR(re.event_type = 'ai_generated') THEN 'AI'
                WHEN BOOL_OR(re.event_type = 'fallback_used') THEN 'Fallback Template'
                ELSE 'Negative Feedback'
              END AS review_source,
              CASE
                WHEN BOOL_OR(re.event_type = 'post_on_google_clicked') THEN 'Review Posted'
                WHEN BOOL_OR(re.event_type = 'negative_feedback') THEN 'Redirected to WhatsApp'
                ELSE 'Incomplete'
              END AS status
            FROM review_events re
            LEFT JOIN course_tags ct ON re.course_tag_id = ct.id
            WHERE re.session_id IN (
              SELECT DISTINCT session_id FROM review_events
              WHERE event_type IN ('ai_generated', 'fallback_used', 'negative_feedback')
            )
            GROUP BY re.session_id
            ORDER BY MAX(re.created_at) DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

      return NextResponse.json({
        data: rows,
        page,
        total_pages: Math.ceil(countQuery[0].total / limit),
        total: countQuery[0].total,
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}