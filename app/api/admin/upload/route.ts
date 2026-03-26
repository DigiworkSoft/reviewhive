import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

// ── POST: upload logo as base64 data URL, stored in system_config ──────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PNG and JPG allowed.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 2MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    // Store the base64 data URL directly in system_config
    await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ('logo_url', ${dataUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${dataUrl}, updated_at = NOW()
    `;

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
