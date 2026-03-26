import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import sql from '@/lib/db';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, color: '#1a1a2e' },
  subtitle: { fontSize: 12, textAlign: 'center', color: '#666', marginBottom: 24 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  kpiBox: { width: '48%', padding: 10, backgroundColor: '#f8f9fa', borderRadius: 6 },
  kpiLabel: { fontSize: 9, color: '#666', marginBottom: 2 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  col1: { width: '35%', fontSize: 10 },
  col2: { width: '20%', fontSize: 10, textAlign: 'center' },
  col3: { width: '20%', fontSize: 10, textAlign: 'center' },
  col4: { width: '25%', fontSize: 10, textAlign: 'right' },
  bold: { fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' },
});

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
    }

    const startDate = `${month}-01`;

    // KPIs
    const kpiRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'scan')::int AS total_scans,
        COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked')::int AS reviews_posted,
        ROUND(COUNT(*) FILTER (WHERE event_type = 'post_on_google_clicked') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE event_type = 'scan'), 0), 1) AS conversion_rate,
        COALESCE(ROUND(AVG(star_rating) FILTER (WHERE event_type = 'post_on_google_clicked' AND star_rating IS NOT NULL)::numeric, 1), 0) AS avg_rating
      FROM review_events
      WHERE created_at >= ${startDate}::date AND created_at < (${startDate}::date + INTERVAL '1 month')
    `;
    const kpi = kpiRows[0];

    // Course breakdown
    const courses = await sql`
      SELECT ct.name,
        COUNT(*) FILTER (WHERE re.event_type = 'course_selected')::int AS scans,
        COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked')::int AS reviews,
        ROUND(COUNT(*) FILTER (WHERE re.event_type = 'post_on_google_clicked') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE re.event_type = 'course_selected'), 0), 1) AS rate
      FROM review_events re JOIN course_tags ct ON re.course_tag_id = ct.id
      WHERE re.created_at >= ${startDate}::date AND re.created_at < (${startDate}::date + INTERVAL '1 month')
      GROUP BY ct.id, ct.name ORDER BY reviews DESC
    `;

    // Rating distribution
    const ratings = await sql`
      SELECT star_rating, COUNT(*)::int AS count
      FROM review_events
      WHERE event_type = 'post_on_google_clicked' AND star_rating BETWEEN 1 AND 5
        AND created_at >= ${startDate}::date AND created_at < (${startDate}::date + INTERVAL '1 month')
      GROUP BY star_rating ORDER BY star_rating
    `;

    const negRows = await sql`
      SELECT COUNT(*)::int AS count FROM review_events
      WHERE event_type = 'negative_feedback'
        AND created_at >= ${startDate}::date AND created_at < (${startDate}::date + INTERVAL '1 month')
    `;

    // Course-wise star ratings
    const courseRatings = await sql`
      SELECT ct.name AS course,
        COUNT(*) FILTER (WHERE re.star_rating = 1)::int AS s1,
        COUNT(*) FILTER (WHERE re.star_rating = 2)::int AS s2,
        COUNT(*) FILTER (WHERE re.star_rating = 3)::int AS s3,
        COUNT(*) FILTER (WHERE re.star_rating = 4)::int AS s4,
        COUNT(*) FILTER (WHERE re.star_rating = 5)::int AS s5
      FROM review_events re JOIN course_tags ct ON re.course_tag_id = ct.id
      WHERE re.event_type = 'post_on_google_clicked' AND re.star_rating BETWEEN 1 AND 5
        AND re.created_at >= ${startDate}::date AND re.created_at < (${startDate}::date + INTERVAL '1 month')
      GROUP BY ct.id, ct.name ORDER BY ct.name
    `;

    const monthLabel = new Date(`${month}-15`).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const doc = React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: s.page },
        React.createElement(Text, { style: s.title }, `Monthly Review Report`),
        React.createElement(Text, { style: s.subtitle }, monthLabel),

        // KPIs 2x2
        React.createElement(View, { style: s.section },
          React.createElement(Text, { style: s.sectionTitle }, 'Key Performance Indicators'),
          React.createElement(View, { style: s.kpiRow },
            React.createElement(View, { style: s.kpiBox },
              React.createElement(Text, { style: s.kpiLabel }, 'Total QR Scans'),
              React.createElement(Text, { style: s.kpiValue }, String(kpi.total_scans)),
            ),
            React.createElement(View, { style: s.kpiBox },
              React.createElement(Text, { style: s.kpiLabel }, 'Reviews Posted'),
              React.createElement(Text, { style: s.kpiValue }, String(kpi.reviews_posted)),
            ),
          ),
          React.createElement(View, { style: s.kpiRow },
            React.createElement(View, { style: s.kpiBox },
              React.createElement(Text, { style: s.kpiLabel }, 'Conversion Rate'),
              React.createElement(Text, { style: s.kpiValue }, `${kpi.conversion_rate ?? 0}%`),
            ),
            React.createElement(View, { style: s.kpiBox },
              React.createElement(Text, { style: s.kpiLabel }, 'Avg Star Rating'),
              React.createElement(Text, { style: s.kpiValue }, String(kpi.avg_rating)),
            ),
          ),
        ),

        // Course Breakdown
        React.createElement(View, { style: s.section },
          React.createElement(Text, { style: s.sectionTitle }, 'Course Breakdown'),
          React.createElement(View, { style: s.tableHeader },
            React.createElement(Text, { style: { ...s.col1, ...s.bold } }, 'Course'),
            React.createElement(Text, { style: { ...s.col2, ...s.bold } }, 'Scans'),
            React.createElement(Text, { style: { ...s.col3, ...s.bold } }, 'Reviews'),
            React.createElement(Text, { style: { ...s.col4, ...s.bold } }, 'Conv. Rate'),
          ),
          ...courses.map((c, i) =>
            React.createElement(View, { key: i, style: s.tableRow },
              React.createElement(Text, { style: s.col1 }, c.name),
              React.createElement(Text, { style: s.col2 }, String(c.scans)),
              React.createElement(Text, { style: s.col3 }, String(c.reviews)),
              React.createElement(Text, { style: s.col4 }, `${c.rate ?? 0}%`),
            )
          ),
        ),

        // Rating Distribution
        React.createElement(View, { style: s.section },
          React.createElement(Text, { style: s.sectionTitle }, 'Rating Distribution'),
          ...ratings.map((r, i) =>
            React.createElement(View, { key: i, style: s.tableRow },
              React.createElement(Text, { style: { width: '50%', fontSize: 10 } }, `${r.star_rating}★`),
              React.createElement(Text, { style: { width: '50%', fontSize: 10, textAlign: 'right' } }, `${r.count} reviews`),
            )
          ),
          React.createElement(View, { style: { ...s.tableRow, backgroundColor: '#fef3c7' } },
            React.createElement(Text, { style: { width: '50%', fontSize: 10, ...s.bold } }, 'Negative (routed to WhatsApp)'),
            React.createElement(Text, { style: { width: '50%', fontSize: 10, textAlign: 'right', ...s.bold } }, String(negRows[0].count)),
          ),
        ),

        // Course-wise Star Ratings
        React.createElement(View, { style: s.section },
          React.createElement(Text, { style: s.sectionTitle }, 'Course-wise Star Ratings'),
          React.createElement(View, { style: s.tableHeader },
            React.createElement(Text, { style: { width: '35%', fontSize: 9, ...s.bold } }, 'Course'),
            React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center', ...s.bold } }, '1★'),
            React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center', ...s.bold } }, '2★'),
            React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center', ...s.bold } }, '3★'),
            React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center', ...s.bold } }, '4★'),
            React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center', ...s.bold } }, '5★'),
          ),
          ...courseRatings.map((cr, i) =>
            React.createElement(View, { key: i, style: s.tableRow },
              React.createElement(Text, { style: { width: '35%', fontSize: 9 } }, cr.course),
              React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center' } }, String(cr.s1)),
              React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center' } }, String(cr.s2)),
              React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center' } }, String(cr.s3)),
              React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center' } }, String(cr.s4)),
              React.createElement(Text, { style: { width: '13%', fontSize: 9, textAlign: 'center' } }, String(cr.s5)),
            )
          ),
        ),

        React.createElement(Text, { style: s.footer }, `Generated on ${new Date().toLocaleDateString('en-IN')} • ReviewHive`),
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="review-report-${month}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}