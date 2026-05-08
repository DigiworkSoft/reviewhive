import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getValidAccessToken, fetchReviews, starRatingToNumber, postReply } from '@/lib/google';
import { generateText } from '@/lib/ai';

// -- Helpers ----------------------------------------------------------------

interface ConfigMap {
  [key: string]: string;
}

async function loadConfig(): Promise<ConfigMap> {
  const rows = await sql`
    SELECT key, value FROM system_config
    WHERE key IN (
      'autoreply_enabled', 'autoreply_star_threshold', 'autoreply_tone',
      'autoreply_sync_from_date', 'autoreply_cron_interval',
      'autoreply_last_cron_run', 'academy_name'
    )
  `;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function sanitizeReply(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const FALLBACK_REPLIES: Record<number, string> = {
  5: 'Thank you so much for your amazing feedback. We are glad you had a great experience and we look forward to seeing you again!',
  4: 'Thank you for the positive review. We appreciate your support and will keep working hard to serve you even better.',
  3: 'Thanks for sharing your experience. Your feedback helps us improve, and we hope to serve you better next time.',
  2: 'Thank you for your feedback. We are sorry your experience did not meet expectations and would love the chance to make it right.',
  1: 'We are truly sorry to hear about your experience. Please contact us directly so we can understand what happened and improve immediately.',
};

// -- Main handler -----------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await loadConfig();

    // Check if auto-reply is enabled
    if (config.autoreply_enabled !== 'true') {
      return NextResponse.json({ skipped: true, reason: 'Auto-reply is disabled' });
    }

    // Check interval — skip if not enough time has passed
    const interval = parseInt(config.autoreply_cron_interval || '60') * 60 * 1000; // minutes → ms
    const lastRun = config.autoreply_last_cron_run
      ? new Date(config.autoreply_last_cron_run).getTime()
      : 0;

    if (Date.now() - lastRun < interval) {
      return NextResponse.json({ skipped: true, reason: 'Too soon since last run' });
    }

    // ── Step 1: Sync new reviews from Google ────────────────────────────
    const tokenRows = await sql`
      SELECT id, access_token, refresh_token, expires_at, account_name, location_name
      FROM google_tokens LIMIT 1
    `;

    if (tokenRows.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Google not connected' });
    }

    const token = tokenRows[0];
    if (!token.account_name || !token.location_name) {
      return NextResponse.json({ skipped: true, reason: 'No account/location in token data' });
    }

    const fullLocationPath = `${token.account_name}/${token.location_name}`;

    const valid = await getValidAccessToken(
      token.access_token, token.refresh_token, Number(token.expires_at),
    );

    if (valid.refreshed) {
      await sql`
        UPDATE google_tokens SET access_token = ${valid.access_token},
          expires_at = ${valid.expires_at}, updated_at = NOW() WHERE id = ${token.id}
      `;
    }

    const syncFromDate = config.autoreply_sync_from_date
      ? new Date(config.autoreply_sync_from_date)
      : null;

    let pageToken: string | undefined;
    let synced = 0;

    do {
      const data = await fetchReviews(valid.access_token, fullLocationPath, 50, pageToken);
      pageToken = data.nextPageToken;

      for (const review of data.reviews) {
        const reviewDate = new Date(review.createTime);
        if (syncFromDate && reviewDate < syncFromDate) continue;

        const rating = starRatingToNumber(review.starRating);
        const hasReply = Boolean(review.reviewReply);
        const initialStatus = hasReply ? 'posted' : 'pending';

        const existing = await sql`
          SELECT id FROM google_reviews WHERE google_review_id = ${review.reviewId}
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE google_reviews SET
              reviewer_name = ${review.reviewer?.displayName || 'Anonymous'},
              reviewer_photo_url = ${review.reviewer?.profilePhotoUrl || null},
              review_text = ${review.comment || ''},
              star_rating = ${rating},
              review_date = ${review.createTime},
              has_existing_reply = ${hasReply},
              reply_status = ${initialStatus},
              updated_at = NOW()
            WHERE google_review_id = ${review.reviewId}
          `;
          if (hasReply && review.reviewReply) {
            const existingReply = await sql`
              SELECT id FROM review_replies
              WHERE google_review_id = ${existing[0].id} AND status = 'posted' LIMIT 1
            `;
            if (existingReply.length === 0) {
              await sql`
                INSERT INTO review_replies (google_review_id, reply_text, status, posted_at)
                VALUES (${existing[0].id}, ${review.reviewReply.comment}, 'posted', ${review.reviewReply.updateTime})
              `;
            }
          }
        } else {
          const inserted = await sql`
            INSERT INTO google_reviews (
              google_review_id, google_review_name, reviewer_name, reviewer_photo_url,
              review_text, star_rating, review_date, has_existing_reply, reply_status
            ) VALUES (
              ${review.reviewId},
              ${`${fullLocationPath}/reviews/${review.reviewId}`},
              ${review.reviewer?.displayName || 'Anonymous'},
              ${review.reviewer?.profilePhotoUrl || null},
              ${review.comment || ''},
              ${rating},
              ${review.createTime},
              ${hasReply},
              ${initialStatus}
            ) RETURNING id
          `;
          if (hasReply && review.reviewReply && inserted.length > 0) {
            await sql`
              INSERT INTO review_replies (google_review_id, reply_text, status, posted_at)
              VALUES (${inserted[0].id}, ${review.reviewReply.comment}, 'posted', ${review.reviewReply.updateTime})
            `;
          }
          synced++;
        }
      }
    } while (pageToken);

    // ── Step 2: Generate AI replies for pending reviews ─────────────────
    const starThreshold = parseInt(config.autoreply_star_threshold || '1');
    const tone = config.autoreply_tone || 'professional';
    const academyName = config.academy_name || 'our academy';

    const pendingReviews = await sql`
      SELECT id, reviewer_name, review_text, star_rating, google_review_name
      FROM google_reviews
      WHERE reply_status = 'pending'
        AND has_existing_reply = false
        AND google_review_name IS NOT NULL
        AND star_rating >= ${starThreshold}
      ORDER BY created_at ASC
      LIMIT 10
    `;

    let generated = 0;
    let posted = 0;

    for (const review of pendingReviews) {
      // Generate AI reply
      const prompt = `
You are a customer support reply assistant for ${academyName}.
Write one concise Google review reply in a ${tone} tone.

Rules:
- Keep it under 80 words.
- Be polite and human.
- If rating is <= 2, apologize and invite offline resolution.
- Do not include markdown, emojis, or signatures.

Reviewer name: ${review.reviewer_name || 'Customer'}
Rating: ${review.star_rating}/5
Review: "${review.review_text}"
`;

      let replyText = '';
      try {
        const result = await generateText(prompt);
        replyText = sanitizeReply(result);
      } catch {
        replyText = FALLBACK_REPLIES[review.star_rating] || FALLBACK_REPLIES[5];
      }

      // Save as approved
      await sql`
        INSERT INTO review_replies (google_review_id, reply_text, status)
        VALUES (${review.id}, ${replyText}, 'approved')
      `;
      await sql`
        UPDATE google_reviews SET reply_status = 'approved', updated_at = NOW()
        WHERE id = ${review.id}
      `;
      generated++;

      // ── Step 3: Post to Google ──────────────────────────────────────
      try {
        await postReply(valid.access_token, review.google_review_name, replyText);

        await sql`
          UPDATE google_reviews SET reply_status = 'posted', updated_at = NOW()
          WHERE id = ${review.id}
        `;
        await sql`
          UPDATE review_replies SET status = 'posted', posted_at = NOW()
          WHERE google_review_id = ${review.id}
          ORDER BY created_at DESC LIMIT 1
        `;
        posted++;
      } catch (postError) {
        console.error(`Failed to post reply for review ${review.id}:`, postError);
        // Leave as approved — admin can manually post later
      }
    }

    // ── Update last cron run timestamp ──────────────────────────────────
    await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ('autoreply_last_cron_run', ${new Date().toISOString()}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${new Date().toISOString()}, updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      synced,
      generated,
      posted,
      message: `Cron complete: ${synced} synced, ${generated} generated, ${posted} posted`,
    });
  } catch (error) {
    console.error('Cron auto-reply error:', error);
    return NextResponse.json(
      { error: 'Cron failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
