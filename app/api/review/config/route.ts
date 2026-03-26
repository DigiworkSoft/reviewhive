import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Public endpoint — returns whatsapp_number and google_review_url for the review page
export async function GET() {
  try {
    const rows = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('whatsapp_number', 'google_review_url', 'academy_name')
    `;
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    // Backward compatibility for the field name used in the frontend
    config.review_redirect_url = config.google_review_url || '';
    return NextResponse.json(config);
  } catch (error) {
    console.error('Review config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
