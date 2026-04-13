import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sql from '@/lib/db';
import { generateText } from '@/lib/ai';

const schema = z.object({
  review_text: z.string().min(3),
  reviewer_name: z.string().optional(),
  rating: z.number().int().min(1).max(5),
});

interface ConfigRow {
  key: string;
  value: string;
}

const FALLBACK_REPLIES: Record<number, string> = {
  5: 'Thank you so much for your amazing feedback. We are glad you had a great experience and we look forward to seeing you again!',
  4: 'Thank you for the positive review. We appreciate your support and will keep working hard to serve you even better.',
  3: 'Thanks for sharing your experience. Your feedback helps us improve, and we hope to serve you better next time.',
  2: 'Thank you for your feedback. We are sorry your experience did not meet expectations and would love the chance to make it right.',
  1: 'We are truly sorry to hear about your experience. Please contact us directly so we can understand what happened and improve immediately.',
};

function sanitizeReply(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { review_text, reviewer_name, rating } = parsed.data;

    const configRows = await sql<ConfigRow[]>`
      SELECT key, value FROM system_config WHERE key IN ('academy_name', 'autoreply_tone')
    `;

    const config = Object.fromEntries(configRows.map((r) => [r.key, r.value]));
    const academyName = config.academy_name || 'our academy';
    const tone = config.autoreply_tone || 'professional';

    const prompt = `
You are a customer support reply assistant for ${academyName}.
Write one concise Google review reply in a ${tone} tone.

Rules:
- Keep it under 80 words.
- Be polite and human.
- If rating is <= 2, apologize and invite offline resolution.
- Do not include markdown, emojis, or signatures.

Reviewer name: ${reviewer_name || 'Customer'}
Rating: ${rating}/5
Review: "${review_text}"
`;

    let reply = '';
    try {
      const generated = await generateText(prompt);
      reply = sanitizeReply(generated);
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      reply = FALLBACK_REPLIES[rating] || FALLBACK_REPLIES[5];
    }

    // Save the generated reply as a draft in review_replies if review_id provided
    const reviewId = body.review_id;
    if (reviewId) {
      await sql`
        INSERT INTO review_replies (google_review_id, reply_text, status)
        VALUES (${reviewId}, ${reply}, 'draft')
      `;
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Generate reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
