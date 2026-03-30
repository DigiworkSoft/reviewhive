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

// ── Pre-prompt Randomization Engine ────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTemp(): number {
  return 0.85 + Math.random() * 0.15; // 0.85–1.0
}

// 1. Opening styles (wide pool — never repeat same start pattern)
const STUDENT_OPENINGS = [
  'Start with a direct bold opinion about the academy.',
  'Start with a personal story — "When I first joined..."',
  'Start with faculty praise — mention the teacher first.',
  'Start mid-thought, abruptly — "honestly didn\'t expect much but..."',
  'Start with a comparison to other coaching/classes you tried before.',
  'Start with a question — "looking for good coaching in [city]?"',
  'Start with your result or achievement first, then explain.',
  'Start with what your friend told you about the academy before joining.',
  'Start with a single strong word or phrase — "Amazing.", "Best decision.", "Worth it."',
  'Start by addressing future students directly — "If you\'re confused about where to join..."',
  'Start with doubt or skepticism you had before joining, then how it changed.',
  'Start with a specific class or moment that stood out to you.',
  'Start with how the academy changed your daily routine or study habits.',
  'Start with gratitude — thank the academy or a teacher directly.',
  'Start with a casual, lazy opener — "so basically I joined here and..."',
];

const PARENT_OPENINGS = [
  'Start with your concern before enrolling your child.',
  'Start with the improvement you noticed in your child.',
  'Start with a direct recommendation — "I would recommend this academy..."',
  'Start with how another parent recommended this place to you.',
  'Start with your child\'s result or achievement.',
  'Start with appreciation for a specific teacher.',
  'Start with the environment or discipline you observed.',
  'Start with a comparison to your child\'s previous coaching.',
  'Start with what your child says about the academy at home.',
  'Start with relief — "finally found the right coaching..."',
  'Start with how long your child has been studying here.',
  'Start by addressing other parents — "to all parents looking for..."',
  'Start with a specific moment when you realized this was the right choice.',
  'Start with trust — how the teachers communicate with parents.',
  'Start with how your child\'s confidence or attitude changed.',
];

// 2. Length targets (100–600 range)
const LENGTH_TARGETS = [
  { label: 'very short', range: '100–150 characters' },
  { label: 'short', range: '150–250 characters' },
  { label: 'medium', range: '250–400 characters' },
  { label: 'long', range: '400–500 characters' },
  { label: 'detailed', range: '500–600 characters' },
];

// 3. Tone
const STUDENT_TONES = [
  'Excited and enthusiastic — lots of energy',
  'Calm and straightforward — just stating facts',
  'Slightly emotional and grateful',
  'Casual and lazy — typing like a text message',
  'Confident and recommending strongly',
  'Humble and genuine — soft tone',
  'Sarcastic at first, then genuine praise',
];

const PARENT_TONES = [
  'Satisfied and grateful',
  'Formal but warm',
  'Straightforward and factual',
  'Emotional — expressing relief and trust',
  'Conversational — like talking to another parent',
  'Proud of child\'s achievement',
  'Calm and measured — balanced feedback',
];

// 4. Language mix
const STUDENT_LANGUAGES = [
  'Pure simple English only',
  'Heavy Hinglish — use Hindi phrases like "bohot accha", "sach me", "ekdum best"',
  'Light Hinglish — just 1-2 Hindi words mixed naturally',
  'Very casual English with shortcuts like "bcz", "u", "thnx", "tbh"',
  'Mix of English and very light Hindi slang',
];

const PARENT_LANGUAGES = [
  'Clean simple English',
  'Slightly formal English',
  'Light Hinglish — 1-2 natural Hindi words like "bahut" or "accha"',
  'Pure English, slightly conversational',
];

// 5. Emoji directive
const STUDENT_EMOJI = [
  'No emojis at all.',
  'Use exactly 1 emoji naturally (like 🙂 or 👍).',
  'Use 2-3 emojis scattered throughout (like 🔥✨👍).',
  'No emojis at all.',
  'Use 1 emoji only at the end.',
];

const PARENT_EMOJI = [
  'No emojis at all.',
  'No emojis at all.',
  'Use exactly 1 emoji (🙂 or 🙏) at the end only.',
  'No emojis.',
];

// 6. Structure
const STUDENT_STRUCTURES = [
  'Write a single continuous paragraph — no line breaks.',
  'Write 2-3 short choppy sentences.',
  'Write one long run-on sentence that flows naturally.',
  'Write a few short lines with line breaks between them.',
  'Write 1-2 short paragraphs.',
  'Write one sentence, then a longer explanation.',
];

const PARENT_STRUCTURES = [
  'Write a single flowing paragraph.',
  'Write 2-3 clear sentences.',
  'Write a short paragraph followed by a recommendation line.',
  'Write 3-4 lines naturally.',
  'Write one clean paragraph with a closing thought.',
];

// 7. Grammar quality
const STUDENT_GRAMMAR = [
  'Clean English with very few mistakes.',
  'Sloppy with typos and shortcuts — "bcz", "u", "thnx", "v good".',
  'Mixed — starts clean, gets casual towards the end.',
  'Slightly broken English — natural for a non-native speaker.',
  'Mostly correct but with occasional informal phrasing.',
];

const PARENT_GRAMMAR = [
  'Clean and correct English.',
  'Simple English with minor imperfections.',
  'Slightly formal but natural.',
  'Conversational — not perfect but clear.',
];

// 8. Faculty mention
function pickFacultyDirective(facultyNames: string): string {
  if (!facultyNames) return 'Do not mention any specific faculty names.';
  const options = [
    `Mention ${facultyNames} by name with specific praise about their teaching.`,
    `Mention ${facultyNames} casually — like "sir teaches well" or "good guidance".`,
    `Do NOT mention any teacher by name in this review — keep it general.`,
    `Briefly mention ${facultyNames} — just a quick natural reference, not the focus.`,
  ];
  return pick(options);
}

// ── Schema ─────────────────────────────────────────────────────────────────
const generateSchema = z.object({
  course_tag_id: z.string().uuid(),
  star_rating: z.number().int().min(5).max(5),
  session_id: z.string().uuid(),
  user_status: z.enum(['pursuing', 'completed']).nullable().optional(),
  reviewer_type: z.enum(['student', 'parent']).nullable().optional(),
  source: z.string().optional(),
});

// ── Prompt Builders ────────────────────────────────────────────────────────
function buildStudentPrompt(
  academyName: string,
  courseName: string,
  courseType: string,
  facultyNames: string,
  courseStatus: string,
): string {
  const opening = pick(STUDENT_OPENINGS);
  const length = pick(LENGTH_TARGETS);
  const tone = pick(STUDENT_TONES);
  const language = pick(STUDENT_LANGUAGES);
  const emoji = pick(STUDENT_EMOJI);
  const structure = pick(STUDENT_STRUCTURES);
  const grammar = pick(STUDENT_GRAMMAR);
  const faculty = pickFacultyDirective(facultyNames);
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  return `[seed:${seed}] You are a real student of ${academyName} writing a Google review.

⚠️ IMPORTANT: You are NOT an AI. You are a normal Indian student writing a review in your own natural way.

## INPUT
* Course: ${courseName} (${courseType})
* Status: ${courseStatus}

## SPECIFIC INSTRUCTIONS FOR THIS REVIEW

**Opening:** ${opening}
**Length:** Write exactly ${length.range} (${length.label} review).
**Tone:** ${tone}
**Language:** ${language}
**Emojis:** ${emoji}
**Structure:** ${structure}
**Grammar:** ${grammar}
**Faculty:** ${faculty}

## CONTENT
${courseStatus === 'pursuing'
    ? 'Write about your ongoing experience — you are currently attending.'
    : 'Write about your completed experience — include results or satisfaction.'}
Include naturally: teaching quality, doubt solving${courseType === 'cet' ? ', CET preparation, test practice' : ''}${courseType === 'programming' ? ', coding practice, projects' : ''}, personal improvement.

## SEO (NATURAL ONLY — do NOT stuff keywords)
Naturally mention "${academyName}" and "${courseName}".

## STRICTLY AVOID
Repetitive format, robotic tone, bullet points, headings, labels, explanations. Just the review text — nothing else.

## OUTPUT
Only the raw review text. Ready to paste on Google. Nothing else.`;
}

function buildParentPrompt(
  academyName: string,
  courseName: string,
  courseType: string,
  facultyNames: string,
  courseStatus: string,
): string {
  const opening = pick(PARENT_OPENINGS);
  const length = pick(LENGTH_TARGETS);
  const tone = pick(PARENT_TONES);
  const language = pick(PARENT_LANGUAGES);
  const emoji = pick(PARENT_EMOJI);
  const structure = pick(PARENT_STRUCTURES);
  const grammar = pick(PARENT_GRAMMAR);
  const faculty = pickFacultyDirective(facultyNames);
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  return `[seed:${seed}] You are a parent of a student at ${academyName}, writing a Google review.

⚠️ IMPORTANT: You are NOT an AI. You are a normal Indian parent writing naturally.

## INPUT
* Course: ${courseName} (${courseType})
* Status: ${courseStatus}

## SPECIFIC INSTRUCTIONS FOR THIS REVIEW

**Opening:** ${opening}
**Length:** Write exactly ${length.range} (${length.label} review).
**Tone:** ${tone}
**Language:** ${language}
**Emojis:** ${emoji}
**Structure:** ${structure}
**Grammar:** ${grammar}
**Faculty:** ${faculty}

## CONTENT
${courseStatus === 'pursuing'
    ? 'Write about your child\'s ongoing improvement — they are currently studying.'
    : 'Write about your child\'s completed experience — results, satisfaction, recommendation.'}
Include naturally: child's improvement, teaching quality${courseType === 'cet' ? ', CET preparation' : ''}, environment, trust in teachers.

## SEO (NATURAL ONLY — do NOT force keywords)
Naturally mention "${academyName}" and "${courseName}".

## STRICTLY AVOID
Student slang, overuse of emojis, robotic repetitive format, corporate tone, bullet points, headings, labels. Just the review text.

## OUTPUT
Only the raw review text. Ready to paste on Google. Nothing else.`;
}

// ── AI Call ────────────────────────────────────────────────────────────────
async function generateWithAI(
  academyName: string,
  courseName: string,
  courseType: string,
  facultyNames: string,
  courseStatus: string,
  reviewerType: string,
): Promise<string> {
  console.log(`--- AI Start: ${academyName} (${courseName}) [${reviewerType}] ---`);

  const systemMessage = reviewerType === 'parent'
    ? `You are a real Indian parent whose child studies at ${academyName}. Write exactly like a real parent would type a Google review — natural, imperfect, believable. Output ONLY the raw review text, nothing else.`
    : `You are a real Indian student at ${academyName}. Write exactly like a real student would type a Google review — natural, imperfect, believable. Output ONLY the raw review text, nothing else.`;

  const prompt = reviewerType === 'parent'
    ? buildParentPrompt(academyName, courseName, courseType, facultyNames, courseStatus)
    : buildStudentPrompt(academyName, courseName, courseType, facultyNames, courseStatus);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const temp = randomTemp();
    console.log(`--- Temperature: ${temp.toFixed(3)} ---`);
    const text = await generateText(prompt, { temperature: temp, systemMessage });
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
  return rows.length > 0 ? rows[0].template_text : 'Great experience at the academy!';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      console.error('Validation error:', parsed.error.format());
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }

    const { course_tag_id, star_rating, session_id, user_status, reviewer_type, source } = parsed.data;
    const ipHash = getIpHash(request);

    if (isRateLimited(ipHash)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    recordRequest(ipHash);

    const configRows = await sql`SELECT value FROM system_config WHERE key = 'academy_name'`;
    const academyName = configRows.length > 0 ? configRows[0].value : 'Our Academy';

    const courseRows = await sql`SELECT name, course_type, faculty_names FROM course_tags WHERE id = ${course_tag_id}`;
    const courseName = courseRows.length > 0 ? courseRows[0].name : 'General';
    const courseType = courseRows.length > 0 ? (courseRows[0].course_type || 'other') : 'other';
    const facultyNames = courseRows.length > 0 ? (courseRows[0].faculty_names || '') : '';
    const courseStatus = user_status || 'pursuing';
    const role = reviewer_type || 'student';

    let review: string;
    let reviewProvider: string;

    try {
      review = await generateWithAI(academyName, courseName, courseType, facultyNames, courseStatus, role);
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
