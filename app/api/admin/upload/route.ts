import { NextRequest, NextResponse } from 'next/server';

// ── POST: upload file (logo image) ─────────────────────────────────────────
// Stores to local /public/uploads/ since Supabase Storage may not be configured.
// If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, uploads to Supabase.
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

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
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `logo-${Date.now()}.${ext}`;

    // Save to public/uploads/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
