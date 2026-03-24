import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';

// ── GET: all fallback templates grouped by course + rating ─────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        ft.id, ft.course_tag_id, ft.star_rating, ft.option_number,
        ft.template_text, ft.is_active,
        ct.name AS course_name
      FROM fallback_templates ft
      LEFT JOIN course_tags ct ON ft.course_tag_id = ct.id
      WHERE ft.is_active = true
      ORDER BY ct.name ASC NULLS LAST, ft.star_rating ASC, ft.option_number ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fallback templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: update one template text ──────────────────────────────────────────
const updateSchema = z.object({
  id: z.string().uuid(),
  template_text: z.string().min(1).max(2000),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }

    const { id, template_text } = parsed.data;

    const rows = await sql`
      UPDATE fallback_templates SET template_text = ${template_text}
      WHERE id = ${id}
      RETURNING id, template_text
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
