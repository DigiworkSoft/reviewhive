import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'png';
    const inline = request.nextUrl.searchParams.get('inline') === 'true';

    const rows = await sql`
      SELECT value FROM system_config WHERE key = 'google_review_url'
    `;
    // Smart Base URL Detection for Vercel vs Local
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl || siteUrl.includes('localhost') || siteUrl.includes('192.168')) {
      siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    }
    const qrTargetUrl = `${siteUrl}/review?src=qr`;

    if (format === 'svg') {
      const svgString = await QRCode.toString(qrTargetUrl, {
        type: 'svg',
        width: 500,
        margin: 2,
        color: { dark: '#000000', light: '#00000000' },
      });
      const svgHeaders: Record<string, string> = { 'Content-Type': 'image/svg+xml' };
      if (!inline) svgHeaders['Content-Disposition'] = 'attachment; filename="qr-code.svg"';
      return new NextResponse(svgString, { headers: svgHeaders });
    }

    // PNG — use toDataURL and strip the data URL prefix
    const dataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 500,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBuffer = Buffer.from(base64, 'base64');
    const pngHeaders: Record<string, string> = { 'Content-Type': 'image/png' };
    if (!inline) pngHeaders['Content-Disposition'] = 'attachment; filename="qr-code.png"';
    return new NextResponse(pngBuffer, { headers: pngHeaders });
  } catch (error) {
    console.error('QR download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
