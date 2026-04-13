import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, listAccounts, listLocations } from '@/lib/google';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/admin/auto-reply?error=google_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin/auto-reply?error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${baseUrl}/admin/auto-reply?error=no_refresh_token`);
    }

    const expiresAt = Date.now() + tokens.expires_in * 1000;

    let accountName = '';
    let locationName = '';
    let locationTitle = '';

    try {
      const accounts = await listAccounts(tokens.access_token);
      if (accounts.length > 0) {
        accountName = accounts[0].name;
        const locations = await listLocations(tokens.access_token, accountName);
        if (locations.length > 0) {
          locationName = locations[0].name;
          locationTitle = locations[0].title || '';
        }
      }
    } catch (e) {
      console.warn('Could not fetch account/location, will need manual selection:', e);
    }

    await sql`DELETE FROM google_tokens`;
    await sql`
      INSERT INTO google_tokens (access_token, refresh_token, expires_at, account_name, location_name, location_title)
      VALUES (${tokens.access_token}, ${tokens.refresh_token}, ${expiresAt}, ${accountName}, ${locationName}, ${locationTitle})
    `;

    return NextResponse.redirect(`${baseUrl}/admin/auto-reply?success=google_connected`);
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${baseUrl}/admin/auto-reply?error=google_failed`);
  }
}
