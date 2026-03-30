import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';

// ── GET: all course tags ordered by display_order ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('inactive') === 'true';

    const rows = includeInactive
      ? await sql`SELECT id, name, description, course_type, faculty_names, display_order, is_active, created_at, updated_at FROM course_tags ORDER BY display_order ASC, name ASC`
      : await sql`SELECT id, name, description, course_type, faculty_names, display_order, is_active, created_at, updated_at FROM course_tags WHERE is_active = true ORDER BY display_order ASC, name ASC`;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Course tags GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: create new course tag ────────────────────────────────────────────
const COURSE_TYPES = ['academic', 'cet', 'programming', 'cyber_security', 'other'] as const;

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  course_type: z.enum(COURSE_TYPES).default('other'),
  faculty_names: z.string().max(255).optional(),
  display_order: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }

    const { name, description, course_type, faculty_names, display_order } = parsed.data;

    const rows = await sql`
      INSERT INTO course_tags (id, name, description, course_type, faculty_names, display_order)
      VALUES (gen_random_uuid(), ${name}, ${description ?? null}, ${course_type}, ${faculty_names ?? null}, ${display_order})
      RETURNING id, name, description, course_type, faculty_names, display_order, is_active
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Course tags POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
