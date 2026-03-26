import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import sql from '@/lib/db';
import path from 'path';
import fs from 'fs';

// ── GET handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const preview = request.nextUrl.searchParams.get('preview') === 'true';

    const configRows = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('academy_name', 'poster_tagline', 'poster_color', 'logo_url', 'google_review_url')
    `;
    const config: Record<string, string> = {};
    for (const row of configRows) config[row.key] = row.value;

    const academyName = config.academy_name || 'Academy';
    const tagline = config.poster_tagline || 'Share your experience!';
    const brandColor = config.poster_color || '#1a1a2e';
    const logoUrl = config.logo_url || '';
    const googleReviewUrl = config.google_review_url || 'https://g.page/review';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const qrTargetUrl = `${siteUrl}/review?src=qr`;

    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 500,
      margin: 2,
      color: { dark: brandColor, light: '#ffffff' },
    });

    const styles = StyleSheet.create({
      page: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 60 },
      border: { position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 3, borderColor: brandColor, borderRadius: 12 },
      logo: { width: 80, height: 80, marginBottom: 16 },
      academyName: { fontSize: 32, fontWeight: 'bold', color: brandColor, marginBottom: 12, textAlign: 'center' },
      tagline: { fontSize: 18, color: '#4a4a6a', marginBottom: 40, textAlign: 'center' },
      qrContainer: { width: 250, height: 250, marginBottom: 40 },
      qrImage: { width: 250, height: 250 },
      instructions: { fontSize: 16, color: '#4a4a6a', marginBottom: 8, textAlign: 'center' },
      url: { fontSize: 10, color: '#888888', marginTop: 20, textAlign: 'center' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [
      React.createElement(View, { key: 'border', style: styles.border }),
    ];

    if (logoUrl) {
      // If it's already a data URL (base64 stored in DB), use directly
      if (logoUrl.startsWith('data:')) {
        children.push(React.createElement(Image, { key: 'logo', style: styles.logo, src: logoUrl }));
      } else {
        // Legacy: local file path
        const logoPath = path.join(process.cwd(), 'public', logoUrl);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const ext = logoUrl.endsWith('.png') ? 'png' : 'jpeg';
          const logoDataUrl = `data:image/${ext};base64,${logoBuffer.toString('base64')}`;
          children.push(React.createElement(Image, { key: 'logo', style: styles.logo, src: logoDataUrl }));
        }
      }
    }

    children.push(
      React.createElement(Text, { key: 'name', style: styles.academyName }, academyName),
      React.createElement(Text, { key: 'tag', style: styles.tagline }, tagline),
      React.createElement(View, { key: 'qr', style: styles.qrContainer },
        React.createElement(Image, { style: styles.qrImage, src: qrDataUrl })
      ),
      React.createElement(Text, { key: 'inst', style: styles.instructions }, 'Scan the QR code to leave a review'),
      React.createElement(Text, { key: 'url', style: styles.url }, googleReviewUrl),
    );

    const pdfDocument = React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page }, ...children)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfDocument as any);

    const headers: Record<string, string> = { 'Content-Type': 'application/pdf' };
    if (!preview) {
      headers['Content-Disposition'] = 'attachment; filename="qr-poster.pdf"';
    } else {
      headers['Content-Disposition'] = 'inline';
    }

    return new NextResponse(new Uint8Array(pdfBuffer), { status: 200, headers });
  } catch (error) {
    console.error('QR Poster error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
