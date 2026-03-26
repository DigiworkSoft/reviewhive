import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'png';

    const rows = await sql`
      SELECT value FROM system_config WHERE key = 'google_review_url'
    `;
    const reviewUrl = rows[0]?.value || process.env.NEXT_PUBLIC_REVIEW_URL || 'https://g.page/review';

    if (format === 'svg') {
      const svgString = await QRCode.toString(reviewUrl, {
        type: 'svg',
        width: 500,
        margin: 2,
        color: { dark: '#000000', light: '#00000000' },
      });
      return new NextResponse(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': 'attachment; filename="qr-code.svg"',
        },
      });
    }

    // PNG — use toDataURL and strip the data URL prefix
    const dataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 500,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBuffer = Buffer.from(base64, 'base64');
    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="qr-code.png"',
      },
    });
  } catch (error) {
    console.error('QR download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
