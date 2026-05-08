import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getValidAccessToken, fetchReviews, starRatingToNumber } from '@/lib/google';

export async function POST() {
  try {
    const tokenRows = await sql`
      SELECT id, access_token, refresh_token, expires_at, account_name, location_name FROM google_tokens LIMIT 1
    `;

    if (tokenRows.length === 0) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 });
    }

    const token = tokenRows[0];
    if (!token.location_name) {
      return NextResponse.json({ error: 'No location selected in Google token data' }, { status: 400 });
    }

    if (!token.account_name) {
      return NextResponse.json({ error: 'No account found in Google token data' }, { status: 400 });
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

    // Read sync cutoff date from config
    const configRows = await sql`
      SELECT value FROM system_config WHERE key = 'autoreply_sync_from_date' LIMIT 1
    `;
    const syncFromDate = configRows.length > 0 && configRows[0].value
      ? new Date(configRows[0].value)
      : null;

    let pageToken: string | undefined;
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    do {
      const data = await fetchReviews(valid.access_token, fullLocationPath, 50, pageToken);
      pageToken = data.nextPageToken;

      for (const review of data.reviews) {
        // Skip reviews older than cutoff date (if configured)
        if (syncFromDate) {
          const reviewDate = new Date(review.createTime);
          if (reviewDate < syncFromDate) {
            skipped++;
            continue;
          }
        }

        const rating = starRatingToNumber(review.starRating);
        const hasReply = Boolean(review.reviewReply);
        // If already replied on Google, mark as posted; otherwise pending
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
              updated_at = NOW()
            WHERE google_review_id = ${review.reviewId}
          `;
          updated++;
        } else {
          await sql`
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
            )
          `;
          imported++;
        }
      }
    } while (pageToken);

    return NextResponse.json({
      success: true, imported, updated, skipped,
      message: `Sync complete: ${imported} new, ${updated} updated, ${skipped} skipped (before cutoff)`,
    });
  } catch (error) {
    console.error('Google sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync reviews', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
