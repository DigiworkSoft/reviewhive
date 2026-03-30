import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';

const COURSE_TYPES = ['academic', 'cet', 'programming', 'cyber_security', 'other'] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  course_type: z.enum(COURSE_TYPES).optional(),
  faculty_names: z.string().max(255).optional().nullable(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// ── PUT: update course tag ─────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }

    const { name, description, course_type, faculty_names, display_order, is_active } = parsed.data;

    const rows = await sql`
      UPDATE course_tags
      SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        course_type = COALESCE(${course_type ?? null}, course_type),
        faculty_names = ${faculty_names === undefined ? sql`faculty_names` : faculty_names},
        display_order = COALESCE(${display_order ?? null}, display_order),
        is_active = COALESCE(${is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, description, course_type, faculty_names, display_order, is_active
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course tag not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Course tag PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: soft-delete (deactivate) course tag ────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await sql`
      UPDATE course_tags SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, is_active
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course tag not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Course tag deactivated', ...rows[0] });
  } catch (error) {
    console.error('Course tag DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
