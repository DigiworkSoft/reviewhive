import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Public endpoint — serves the academy logo as an image for favicon / OG
export async function GET() {
  try {
    const rows = await sql`
      SELECT value FROM system_config WHERE key = 'logo_url' LIMIT 1
    `;

    const dataUrl = rows[0]?.value;
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return new NextResponse(null, { status: 404 });
    }

    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
