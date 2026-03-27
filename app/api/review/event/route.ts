import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import sql from '@/lib/db';
import crypto from 'crypto';

const eventSchema = z.object({
  event_type: z.enum([
    'scan',
    'course_selected',
    'rating_submitted',
    'ai_generated',
    'fallback_used',
    'option_selected',
    'post_on_google_clicked',
    'negative_feedback',
    'status_selected',
  ]),
  course_tag_id: z.string().uuid().optional().nullable(),
  star_rating: z.number().int().min(1).max(5).optional().nullable(),
  session_id: z.string().uuid(),
  user_status: z.enum(['pursuing', 'completed']).optional().nullable(),
  ai_used: z.boolean().optional().nullable(),
  option_number_selected: z.number().int().min(1).max(3).optional().nullable(),
  source: z.string().optional().nullable(),
  generated_text: z.string().optional().nullable(),
});

function getIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1';
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function getUserAgentCategory(ua: string | null): string {
  if (!ua) return 'desktop';
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(lower)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(lower)) return 'mobile';
  return 'desktop';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ipHash = getIpHash(request);
    const userAgent = request.headers.get('user-agent');
    const uaCategory = getUserAgentCategory(userAgent);

    await sql`
      INSERT INTO review_events (
        event_type,
        course_tag_id,
        star_rating,
        ai_used,
        option_number_selected,
        session_id,
        ip_hash,
        user_agent_category,
        user_status,
        source,
        generated_text
      ) VALUES (
        ${data.event_type},
        ${data.course_tag_id ?? null},
        ${data.star_rating ?? null},
        ${data.ai_used ?? null},
        ${data.option_number_selected ?? null},
        ${data.session_id},
        ${ipHash},
        ${uaCategory},
        ${data.user_status ?? null},
        ${data.source ?? 'direct'},
        ${data.generated_text ?? null}
      )
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Event logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
