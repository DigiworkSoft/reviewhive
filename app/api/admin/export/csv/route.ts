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
    const header = 'Date (IST),Time (IST),Event Type,Course,Star Rating,AI Used,Option Selected,Source\n';

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(header));
        const batchSize = 500;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const rows = await sql`
            SELECT
              TO_CHAR(re.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
              TO_CHAR(re.created_at AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS') AS time,
              re.event_type,
              COALESCE(ct.name, '') AS course,
              COALESCE(re.star_rating::text, '') AS star_rating,
              CASE WHEN re.ai_used = true THEN 'Yes' WHEN re.ai_used = false THEN 'No' ELSE '' END AS ai_used,
              COALESCE(re.option_number_selected::text, '') AS option_selected,
              COALESCE(re.source, 'direct') AS source
            FROM review_events re
            LEFT JOIN course_tags ct ON re.course_tag_id = ct.id
            WHERE re.created_at >= ${from}::date
              AND re.created_at < (${to}::date + INTERVAL '1 day')
            ORDER BY re.created_at ASC
            LIMIT ${batchSize} OFFSET ${offset}
          `;

          for (const row of rows) {
            const line = `${row.date},${row.time},${row.event_type},"${row.course}",${row.star_rating},${row.ai_used},${row.option_selected},${row.source}\n`;
            controller.enqueue(encoder.encode(line));
          }

          offset += batchSize;
          hasMore = rows.length === batchSize;
        }

        controller.close();
      },
    });

    const today = new Date().toISOString().split('T')[0];
    return new NextResponse(stream, {
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
