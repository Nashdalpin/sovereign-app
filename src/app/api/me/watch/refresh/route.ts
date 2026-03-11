import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/me/watch/refresh
 * Body: { refresh_token: string }
 * Returns: { access_token, refresh_token, expires_in } for the watch to store.
 * Used so the watch can renew its access token without the user re-copying from the app.
 */
export async function POST(request: Request) {
  let body: { refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const refreshToken = body.refresh_token?.trim();
  if (!refreshToken) {
    return NextResponse.json({ error: 'refresh_token required' }, { status: 400 });
  }

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.msg || data.error_description || 'Refresh failed' },
      { status: res.status }
    );
  }

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_in: data.expires_in ?? 3600,
  });
}
