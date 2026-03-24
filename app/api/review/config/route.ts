import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Public endpoint — returns whatsapp_number and google_review_url for the review page
export async function GET() {
  try {
    const rows = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('whatsapp_number', 'google_review_url')
    `;
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    // The redirect URL after copying a review (from env, not DB)
    config.review_redirect_url = process.env.NEXT_PUBLIC_REVIEW_URL || '';
    return NextResponse.json(config);
  } catch (error) {
    console.error('Review config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
