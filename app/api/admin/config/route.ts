import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
  'academy_aliases',
  'autoreply_enabled', 'autoreply_star_threshold', 'autoreply_tone',
  'autoreply_delay_min', 'autoreply_delay_max',
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

    // 1. Get current value for audit log
    const currentRows = await sql`SELECT value FROM system_config WHERE key = ${key}`;
    const oldValue = currentRows.length > 0 ? currentRows[0].value : null;

    // 2. Upsert config
    const result = await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
      RETURNING key, value
    `;

    // 3. Log the change to audit log
    if (oldValue !== value) {
      await sql`
        INSERT INTO config_audit_log (config_key, old_value, new_value)
        VALUES (${key}, ${oldValue}, ${value})
      `;
    }

    return NextResponse.json({ message: 'Config updated', key: result[0].key, value: result[0].value });
  } catch (error) {
    console.error('Config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
