import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

interface ReviewRow {
  id: number;
  review_id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  status: string;
  ai_suggested_reply: string | null;
  final_reply: string | null;
  review_date: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  count: string;
}

interface StatsRow {
  pending: string;
  approved: string;
  rejected: string;
  posted: string;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

// -- GET: List reviews with pagination & stats ------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 10);
    const offset = (page - 1) * limit;

    let reviews: ReviewRow[];
    let totalRows: CountRow[];

    if (status === 'all') {
      reviews = await sql<ReviewRow[]>`
        SELECT id, google_review_id AS review_id, reviewer_name, review_text, star_rating AS rating,
               reply_status AS status, NULL AS ai_suggested_reply, NULL AS final_reply,
               review_date, NULL::timestamptz AS replied_at,
               created_at, updated_at
        FROM google_reviews
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      totalRows = await sql<CountRow[]>`SELECT COUNT(*)::text AS count FROM google_reviews`;
    } else {
      reviews = await sql<ReviewRow[]>`
        SELECT id, google_review_id AS review_id, reviewer_name, review_text, star_rating AS rating,
               reply_status AS status, NULL AS ai_suggested_reply, NULL AS final_reply,
               review_date, NULL::timestamptz AS replied_at,
               created_at, updated_at
        FROM google_reviews
        WHERE reply_status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      totalRows = await sql<CountRow[]>`SELECT COUNT(*)::text AS count FROM google_reviews WHERE reply_status = ${status}`;
    }

    // Attach latest reply text for each review
    for (const r of reviews) {
      const replies = await sql`
        SELECT reply_text, status, posted_at FROM review_replies
        WHERE google_review_id = ${r.id}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (replies.length > 0) {
        if (replies[0].status === 'draft') {
          r.ai_suggested_reply = replies[0].reply_text;
        } else {
          r.final_reply = replies[0].reply_text;
        }
        r.replied_at = replies[0].posted_at || null;
      }
    }

    const statsRows = await sql<StatsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE reply_status = 'pending')::text  AS pending,
        COUNT(*) FILTER (WHERE reply_status = 'approved')::text AS approved,
        COUNT(*) FILTER (WHERE reply_status = 'rejected')::text AS rejected,
        COUNT(*) FILTER (WHERE reply_status = 'posted')::text   AS posted
      FROM google_reviews
    `;

    const total = Number(totalRows[0]?.count || '0');
    const stats = statsRows[0] || { pending: '0', approved: '0', rejected: '0', posted: '0' };

    return NextResponse.json({
      reviews,
      pagination: {
        page, limit, total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        pending: Number(stats.pending),
        approved: Number(stats.approved),
        rejected: Number(stats.rejected),
        posted: Number(stats.posted),
      },
    });
  } catch (error) {
    console.error('Auto-reply GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -- POST: Add manual review ------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewer_name, review_text, rating } = body;

    if (!reviewer_name || !review_text || !rating) {
      return NextResponse.json(
        { error: 'reviewer_name, review_text, rating are required' },
        { status: 400 },
      );
    }

    const reviewId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const rows = await sql`
      INSERT INTO google_reviews (google_review_id, reviewer_name, review_text, star_rating, reply_status)
      VALUES (${reviewId}, ${reviewer_name}, ${review_text}, ${rating}, 'pending')
      RETURNING id, google_review_id AS review_id, reviewer_name, review_text,
                star_rating AS rating, reply_status AS status, created_at, updated_at
    `;

    return NextResponse.json({ success: true, review: rows[0] });
  } catch (error) {
    console.error('Auto-reply POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -- DELETE: Remove a review ------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await sql`DELETE FROM review_replies WHERE google_review_id = ${id}`;
    await sql`DELETE FROM google_reviews WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auto-reply DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
