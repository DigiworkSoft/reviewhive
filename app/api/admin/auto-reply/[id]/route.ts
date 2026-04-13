import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';
import { getValidAccessToken, postReply } from '@/lib/google';

const updateSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit', 'skip', 'post_to_google']),
  reply_text: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action, reply_text } = parsed.data;

    const rows = await sql`
      SELECT id, google_review_id, google_review_name, reply_status
      FROM google_reviews WHERE id = ${id} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const review = rows[0];

    // Get latest reply text if needed
    const latestReply = await sql`
      SELECT reply_text FROM review_replies
      WHERE google_review_id = ${review.id}
      ORDER BY created_at DESC LIMIT 1
    `;
    const existingReplyText = latestReply.length > 0 ? latestReply[0].reply_text : null;

    // ── Post to Google ─────────────────────────────────────────────────
    if (action === 'post_to_google') {
      const replyToPost = reply_text || existingReplyText;
      if (!replyToPost) {
        return NextResponse.json({ error: 'No reply text available to post' }, { status: 400 });
      }

      if (!review.google_review_name) {
        return NextResponse.json(
          { error: 'This review is manual and cannot be posted to Google' },
          { status: 400 },
        );
      }

      const tokenRows = await sql`
        SELECT id, access_token, refresh_token, expires_at FROM google_tokens LIMIT 1
      `;
      if (tokenRows.length === 0) {
        return NextResponse.json({ error: 'Google not connected' }, { status: 400 });
      }

      const token = tokenRows[0];
      const valid = await getValidAccessToken(
        token.access_token, token.refresh_token, Number(token.expires_at),
      );

      if (valid.refreshed) {
        await sql`
          UPDATE google_tokens SET access_token = ${valid.access_token},
            expires_at = ${valid.expires_at}, updated_at = NOW() WHERE id = ${token.id}
        `;
      }

      await postReply(valid.access_token, review.google_review_name, replyToPost);

      await sql`UPDATE google_reviews SET reply_status = 'posted', updated_at = NOW() WHERE id = ${id}`;
      await sql`
        INSERT INTO review_replies (google_review_id, reply_text, status, posted_at)
        VALUES (${id}, ${replyToPost}, 'posted', NOW())
      `;

      return NextResponse.json({ success: true, status: 'posted' });
    }

    // ── Other actions ──────────────────────────────────────────────────
    let nextStatus = review.reply_status;
    let finalReply = existingReplyText;

    if (action === 'approve') {
      nextStatus = 'approved';
      finalReply = reply_text || existingReplyText || null;
    }

    if (action === 'reject') nextStatus = 'rejected';
    if (action === 'skip') nextStatus = 'skipped';

    if (action === 'edit') {
      if (!reply_text || !reply_text.trim()) {
        return NextResponse.json({ error: 'reply_text is required for edit action' }, { status: 400 });
      }
      nextStatus = 'approved';
      finalReply = reply_text.trim();
    }

    await sql`UPDATE google_reviews SET reply_status = ${nextStatus}, updated_at = NOW() WHERE id = ${id}`;

    if ((nextStatus === 'approved' || action === 'edit') && finalReply) {
      await sql`
        INSERT INTO review_replies (google_review_id, reply_text, status)
        VALUES (${id}, ${finalReply}, 'approved')
      `;
    }

    return NextResponse.json({ success: true, status: nextStatus, final_reply: finalReply });
  } catch (error) {
    console.error('Auto-reply update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
