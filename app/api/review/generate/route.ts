import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sql from '@/lib/db';
import crypto from 'crypto';

// ── In-memory rate limiting: 20 requests per IP per hour ───────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20;

function getIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1';
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  if (!entry) return false;
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.delete(ipHash);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
}

function recordRequest(ipHash: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ipHash, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
}

// ── Schema ─────────────────────────────────────────────────────────────────
const generateSchema = z.object({
  course_tag_id: z.string().uuid(),
  star_rating: z.number().int().min(4).max(5),
  session_id: z.string().uuid(),
  source: z.string().optional(),
});

// ── Gemini AI call with timeout ────────────────────────────────────────────
async function generateWithAI(
  academyName: string,
  courseTag: string,
  starRating: number
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are a helpful assistant. Generate exactly 3 distinct, genuine-sounding, first-person Google reviews for a coaching academy. Each review must be 60–120 words. Tone 1: enthusiastic and detailed. Tone 2: professional and measured. Tone 3: concise and warm. Return only a valid JSON array: ["review1", "review2", "review3"]. No text outside the JSON.\n\nAcademy: ${academyName}. Course: ${courseTag}. Rating: ${starRating} stars. Generate 3 reviews.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    clearTimeout(timeout);

    const text = result.response.text();
    const reviews = JSON.parse(text);

    if (!Array.isArray(reviews) || reviews.length !== 3) {
      throw new Error('Invalid AI response format');
    }

    return reviews;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ── Fallback templates ─────────────────────────────────────────────────────
async function getFallbackTemplates(
  courseTagId: string,
  starRating: number
): Promise<string[]> {
  const rows = await sql`
    SELECT template_text
    FROM fallback_templates
    WHERE (course_tag_id = ${courseTagId} OR course_tag_id IS NULL)
      AND star_rating = ${starRating}
      AND is_active = true
    ORDER BY
      CASE WHEN course_tag_id IS NOT NULL THEN 0 ELSE 1 END,
      option_number ASC
    LIMIT 3
  `;

  if (rows.length === 0) {
    return [
      'I had a great experience at this academy. The teaching quality is excellent.',
      'Very good coaching institute with knowledgeable faculty and supportive environment.',
      'Highly recommend this academy for quality education and personal attention.',
    ];
  }

  return rows.map((r) => r.template_text);
}

// ── POST handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { course_tag_id, star_rating, session_id, source } = parsed.data;
    const ipHash = getIpHash(request);

    // Rate limit check
    if (isRateLimited(ipHash)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 AI generation requests per hour.' },
        { status: 429 }
      );
    }

    recordRequest(ipHash);

    // Get academy name from config
    const configRows = await sql`SELECT value FROM system_config WHERE key = 'academy_name'`;
    const academyName = configRows.length > 0 ? configRows[0].value : 'Our Academy';

    // Get course tag name
    const courseRows = await sql`SELECT name FROM course_tags WHERE id = ${course_tag_id}`;
    const courseTag = courseRows.length > 0 ? courseRows[0].name : 'General';

    let reviews: string[];
    let reviewSource: 'ai' | 'fallback';

    try {
      reviews = await generateWithAI(academyName, courseTag, star_rating);
      reviewSource = 'ai';
    } catch (error) {
      console.error('AI generation failed, using fallback:', error);
      reviews = await getFallbackTemplates(course_tag_id, star_rating);
      reviewSource = 'fallback';
    }

    // Log the event
    const userAgent = request.headers.get('user-agent');
    const uaCategory = /tablet|ipad/i.test(userAgent || '')
      ? 'tablet'
      : /mobile|iphone|android.*mobile/i.test(userAgent || '')
        ? 'mobile'
        : 'desktop';

    await sql`
      INSERT INTO review_events (
        event_type, course_tag_id, star_rating, ai_used,
        session_id, ip_hash, user_agent_category, source
      ) VALUES (
        ${reviewSource === 'ai' ? 'ai_generated' : 'fallback_used'},
        ${course_tag_id},
        ${star_rating},
        ${reviewSource === 'ai'},
        ${session_id},
        ${ipHash},
        ${uaCategory},
        ${source ?? 'direct'}
      )
    `;

    return NextResponse.json({ reviews, source: reviewSource });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
