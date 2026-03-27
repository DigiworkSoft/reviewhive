import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { generateText } from '@/lib/ai';
import sql from '@/lib/db';
import crypto from 'crypto';

// ── In-memory rate limiting: 20 requests per IP per hour ───────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
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

// ── Randomization pools ────────────────────────────────────────────────────
const PERSONAS = [
  'a first-year student who just joined',
  'a final-year student about to graduate',
  'a student who switched from another academy',
  'a student preparing for competitive exams',
  'a student who attended the summer crash course',
  'a recent graduate reflecting on their experience',
];

const PROMPT_TEMPLATES = [
  (persona: string) => `Write as ${persona}. Use an enthusiastic and heartfelt tone.`,
  (persona: string) => `Write as ${persona}. Focus on specific aspects like teaching quality, study materials, or campus environment.`,
  (persona: string) => `Write as ${persona}. Tell a brief story about a specific moment or experience at the academy.`,
  (persona: string) => `Write as ${persona}. Write casually, like you're telling a friend why they should join.`,
  (persona: string) => `Write as ${persona}. Express gratitude and mention how the academy helped you grow or achieve a goal.`,
];

const FOCUS_AREAS = [
  'teaching quality', 'study materials', 'campus environment',
  'placement support', 'peer learning', 'personal growth',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomLengthRange(): string {
  const min = 30 + Math.floor(Math.random() * 15);
  const max = min + 10 + Math.floor(Math.random() * 10);
  return `${min}–${Math.min(max, 60)}`;
}

// ── Schema ─────────────────────────────────────────────────────────────────
const generateSchema = z.object({
  course_tag_id: z.string().uuid(),
  star_rating: z.number().int().min(5).max(5),
  session_id: z.string().uuid(),
  user_status: z.enum(['pursuing', 'completed']).nullable().optional(),
  source: z.string().optional(),
});

// ── AI Call ────────────────────────────────────────────────────────────────
async function generateWithAI(
  academyName: string,
  courseTag: string,
  starRating: number,
  userStatus?: 'pursuing' | 'completed' | null
): Promise<string> {
  console.log(`--- AI Start: ${academyName} (${courseTag}) ---`);

  let statusContext = '';
  if (userStatus === 'pursuing') {
    statusContext = 'Write as a student currently attending the course.';
  } else if (userStatus === 'completed') {
    statusContext = 'Write as a graduate who has completed the course.';
  }

  const persona = pick(PERSONAS);
  const template = pick(PROMPT_TEMPLATES)(persona);
  const focus = pickN(FOCUS_AREAS, 2).join(' and ');
  const lengthGuide = randomLengthRange();

  const prompt = `
Write a Google review for ${academyName} about ${courseTag}.

${template}
Focus on: ${focus}
${statusContext}
Rating: ${starRating} stars.

STYLE RULES:
- Write in casual Indian English (like real students)
- Keep it natural, slightly imperfect
- Mix sentence lengths
- Can use phrases like "honestly", "tbh", "at first I thought"
- Avoid fancy or corporate words

CONSTRAINTS:
- Length: ${lengthGuide} words
- No emojis
- No repetitive sentence structure
- Make it feel like a real personal experience

OUTPUT:
Only the review text.
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const text = await generateText(prompt, { temperature: 0.85 });
    clearTimeout(timeout);
    console.log('--- AI Success ---\n', text);
    return text;
  } catch (error) {
    clearTimeout(timeout);
    console.error('--- AI Failed: ---', error);
    throw error;
  }
}

async function getFallbackTemplate(
  courseTagId: string,
  starRating: number,
  userStatus?: 'pursuing' | 'completed' | null
): Promise<string> {
  const rows = await sql`
    SELECT template_text
    FROM fallback_templates
    WHERE (course_tag_id = ${courseTagId} OR course_tag_id IS NULL)
      AND star_rating = ${starRating}
      AND (user_status = ${userStatus ?? null} OR user_status IS NULL)
      AND is_active = true
    ORDER BY
      CASE WHEN course_tag_id IS NOT NULL THEN 0 ELSE 1 END,
      RANDOM()
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].template_text : 'Great experience at NSG Academy!';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      console.error('Validation error:', parsed.error.format());
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }

    const { course_tag_id, star_rating, session_id, user_status, source } = parsed.data;
    const ipHash = getIpHash(request);

    if (isRateLimited(ipHash)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    recordRequest(ipHash);

    const configRows = await sql`SELECT value FROM system_config WHERE key = 'academy_name'`;
    const academyName = configRows.length > 0 ? configRows[0].value : 'Our Academy';

    const courseRows = await sql`SELECT name FROM course_tags WHERE id = ${course_tag_id}`;
    const courseTag = courseRows.length > 0 ? courseRows[0].name : 'General';

    let review: string;
    let reviewProvider: string;

    try {
      review = await generateWithAI(academyName, courseTag, star_rating, user_status);
      reviewProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    } catch (error) {
      review = await getFallbackTemplate(course_tag_id, star_rating, user_status);
      reviewProvider = 'fallback';
    }

    return NextResponse.json({ review, provider: reviewProvider });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
