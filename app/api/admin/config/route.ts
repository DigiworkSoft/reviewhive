import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';

// ── GET: Return all system_config as key-value object ──────────────────────
export async function GET() {
  try {
    const rows = await sql`SELECT key, value FROM system_config`;
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update one config key ─────────────────────────────────────────────
const ALLOWED_KEYS = [
  'google_review_url', 'whatsapp_number',
  'academy_name', 'logo_url', 'poster_tagline', 'poster_color', 'ai_enabled',
];

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { error: `Key '${key}' is not configurable. Allowed: ${ALLOWED_KEYS.join(', ')}` },
        { status: 403 }
      );
    }

    // Upsert: insert if not exists, update if exists
    const result = await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
      RETURNING key, value
    `;

    return NextResponse.json({ message: 'Config updated', key: result[0].key, value: result[0].value });
  } catch (error) {
    console.error('Config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
