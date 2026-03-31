import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';

// ── GET: all fallback templates ────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        ft.id, ft.course_tag_id, ft.star_rating, ft.option_number,
        ft.template_text, ft.is_active, ft.user_status, ft.reviewer_type,
        ft.weight, ft.category, ft.tags, ft.usage_count, ft.last_used_at,
        ct.name AS course_name
      FROM fallback_templates ft
      LEFT JOIN course_tags ct ON ft.course_tag_id = ct.id
      ORDER BY ft.weight DESC, ft.category ASC, ft.reviewer_type ASC NULLS LAST
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fallback templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: create new template ──────────────────────────────────────────────
const createSchema = z.object({
  template_text: z.string().min(1).max(2000),
  star_rating: z.number().int().min(1).max(5).default(5),
  user_status: z.enum(['pursuing', 'completed']).nullable().optional(),
  reviewer_type: z.enum(['student', 'parent']).nullable().optional(),
  category: z.enum(['emotional', 'result-based', 'faculty-based', 'environment-based']).optional(),
  tags: z.array(z.string()).default([]),
  weight: z.number().int().min(1).max(10).default(1),
  course_tag_id: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }

    const { template_text, star_rating, user_status, reviewer_type, category, tags, weight, course_tag_id } = parsed.data;

    const rows = await sql`
      INSERT INTO fallback_templates (star_rating, option_number, user_status, template_text, reviewer_type, category, tags, weight, course_tag_id)
      VALUES (${star_rating}, 1, ${user_status ?? null}, ${template_text}, ${reviewer_type ?? null}, ${category ?? null}, ${tags}, ${weight}, ${course_tag_id ?? null})
      RETURNING id, star_rating, user_status, template_text, reviewer_type, category, tags, weight, is_active, usage_count
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Fallback template POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: update one template ───────────────────────────────────────────────
const updateSchema = z.object({
  id: z.string().uuid(),
  template_text: z.string().min(1).max(2000).optional(),
  weight: z.number().int().min(1).max(10).optional(),
  category: z.enum(['emotional', 'result-based', 'faculty-based', 'environment-based']).optional().nullable(),
  tags: z.array(z.string()).optional(),
  reviewer_type: z.enum(['student', 'parent']).nullable().optional(),
  user_status: z.enum(['pursuing', 'completed']).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }

    const { id, template_text, weight, category, tags, reviewer_type, user_status, is_active } = parsed.data;

    const rows = await sql`
      UPDATE fallback_templates
      SET
        template_text = COALESCE(${template_text ?? null}, template_text),
        weight = COALESCE(${weight ?? null}, weight),
        category = ${category === undefined ? sql`category` : category},
        tags = ${tags === undefined ? sql`tags` : tags},
        reviewer_type = ${reviewer_type === undefined ? sql`reviewer_type` : reviewer_type},
        user_status = ${user_status === undefined ? sql`user_status` : user_status},
        is_active = COALESCE(${is_active ?? null}, is_active)
      WHERE id = ${id}
      RETURNING id, template_text, weight, category, tags, reviewer_type, user_status, is_active
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template updated', ...rows[0] });
  } catch (error) {
    console.error('Fallback template PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: deactivate template ────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rows = await sql`
      UPDATE fallback_templates SET is_active = false WHERE id = ${id}
      RETURNING id, is_active
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template deactivated', ...rows[0] });
  } catch (error) {
    console.error('Fallback template DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
