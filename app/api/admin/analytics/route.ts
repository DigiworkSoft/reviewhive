import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type !== 'kpi') {
      return NextResponse.json({ error: 'Invalid type parameter. Use ?type=kpi' }, { status: 400 });
    }

    // Total scans (all time)
    const scansResult = await sql`
      SELECT COUNT(*)::int AS count FROM review_events WHERE event_type = 'scan'
    `;

    // Total reviews posted (post_on_google_clicked events)
    const reviewsResult = await sql`
      SELECT COUNT(*)::int AS count FROM review_events WHERE event_type = 'post_on_google_clicked'
    `;

    // Average star rating (only 4★ and 5★ events)
    const avgResult = await sql`
      SELECT COALESCE(ROUND(AVG(star_rating)::numeric, 1), 0) AS avg
      FROM review_events
      WHERE event_type = 'rating_submitted'
        AND star_rating IN (4, 5)
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
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
