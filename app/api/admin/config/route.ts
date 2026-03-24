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
const ALLOWED_KEYS_PHASE1 = ['google_review_url', 'whatsapp_number'];

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
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

    if (!ALLOWED_KEYS_PHASE1.includes(key)) {
      return NextResponse.json(
        { error: `Key '${key}' is not configurable in Phase 1. Allowed: ${ALLOWED_KEYS_PHASE1.join(', ')}` },
        { status: 403 }
      );
    }

    const result = await sql`
      UPDATE system_config
      SET value = ${value}, updated_at = NOW()
      WHERE key = ${key}
      RETURNING key, value
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: `Config key '${key}' not found` }, { status: 404 });
    }

    return NextResponse.json({ message: 'Config updated', key: result[0].key, value: result[0].value });
  } catch (error) {
    console.error('Config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
