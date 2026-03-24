import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import sql from '@/lib/db';

// ── PDF Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 60,
  },
  academyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#4a4a6a',
    marginBottom: 40,
    textAlign: 'center',
  },
  qrContainer: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  instructions: {
    fontSize: 16,
    color: '#4a4a6a',
    marginBottom: 8,
    textAlign: 'center',
  },
  url: {
    fontSize: 12,
    color: '#888888',
    marginTop: 20,
    textAlign: 'center',
  },
  border: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 3,
    borderColor: '#1a1a2e',
    borderRadius: 12,
  },
});

// ── GET handler ────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const reviewUrl = process.env.NEXT_PUBLIC_REVIEW_URL || 'https://reviews.youracademy.in/review';

    // Get academy name and tagline from system_config
    const configRows = await sql`
      SELECT key, value FROM system_config WHERE key IN ('academy_name', 'tagline')
    `;
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    const academyName = config.academy_name || process.env.NEXT_PUBLIC_ACADEMY_NAME || 'Academy';
    const tagline = config.tagline || 'Share your experience!';

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 500,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    // Build the PDF document element directly
    const pdfDocument = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(View, { style: styles.border }),
        React.createElement(Text, { style: styles.academyName }, academyName),
        React.createElement(Text, { style: styles.tagline }, tagline),
        React.createElement(
          View,
          { style: styles.qrContainer },
          React.createElement(Image, { style: styles.qrImage, src: qrDataUrl })
        ),
        React.createElement(Text, { style: styles.instructions }, 'Scan the QR code to leave a review'),
        React.createElement(Text, { style: styles.url }, reviewUrl)
      )
    );

    // Render PDF to buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfDocument as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="qr-poster.pdf"',
      },
    });
  } catch (error) {
    console.error('QR Poster error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
