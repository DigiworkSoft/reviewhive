import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google';

export async function GET() {
  try {
    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Google connect error:', error);
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.' },
      { status: 500 }
    );
  }
}
