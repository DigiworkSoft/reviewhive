/**
 * Google Business Profile API Integration
 *
 * Handles OAuth2 flow, review fetching, and reply posting.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID     -> from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET -> from Google Cloud Console
 *   GOOGLE_REDIRECT_URI  -> e.g. https://yourdomain.com/api/admin/auto-reply/google/callback
 *
 * Required APIs enabled in Google Cloud Console:
 *   - Google My Business API (mybusinessbusinessinformation)
 *   - My Business Account Management API
 *
 * Scopes used:
 *   - https://www.googleapis.com/auth/business.manage (read reviews + reply)
 */

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

// -- OAuth URL Generation ---------------------------------------------------
export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// -- Exchange auth code for tokens -----------------------------------------
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

// -- Refresh access token ---------------------------------------------------
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}

// -- Get a valid access token (auto-refresh if expired) --------------------
export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<{ access_token: string; expires_at: number; refreshed: boolean }> {
  if (Date.now() < (expiresAt - 60_000)) {
    return { access_token: accessToken, expires_at: expiresAt, refreshed: false };
  }

  const result = await refreshAccessToken(refreshToken);
  return {
    access_token: result.access_token,
    expires_at: Date.now() + result.expires_in * 1000,
    refreshed: true,
  };
}

// -- List GBP accounts -----------------------------------------------------
export async function listAccounts(accessToken: string): Promise<
  { name: string; accountName: string; type: string }[]
> {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`List accounts failed: ${err}`);
  }

  const data = await res.json();
  return data.accounts || [];
}

// -- List locations for an account -----------------------------------------
export async function listLocations(
  accessToken: string,
  accountName: string,
): Promise<{ name: string; title: string; storefrontAddress?: object }[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`List locations failed: ${err}`);
  }

  const data = await res.json();
  return data.locations || [];
}

// -- Review types ----------------------------------------------------------
interface GoogleReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

export function starRatingToNumber(rating: string): number {
  return STAR_MAP[rating] || 5;
}

// -- Fetch reviews ---------------------------------------------------------
export async function fetchReviews(
  accessToken: string,
  locationName: string,
  pageSize = 50,
  pageToken?: string,
): Promise<{ reviews: GoogleReview[]; nextPageToken?: string; totalReviewCount?: number }> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fetch reviews failed: ${err}`);
  }

  const data = await res.json();
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken,
    totalReviewCount: data.totalReviewCount,
  };
}

// -- Post reply to a review ------------------------------------------------
export async function postReply(
  accessToken: string,
  reviewName: string,
  replyText: string,
): Promise<{ comment: string; updateTime: string }> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: replyText }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Post reply failed: ${err}`);
  }

  return res.json();
}

// -- Delete reply from a review --------------------------------------------
export async function deleteReply(
  accessToken: string,
  reviewName: string,
): Promise<void> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Delete reply failed: ${err}`);
  }
}
