import { NextResponse } from 'next/server';
import { getTurnstileSiteKey } from '@/lib/turnstile-config';

export async function GET() {
  const siteKey = getTurnstileSiteKey();

  if (!siteKey) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  return NextResponse.json(
    { configured: true, siteKey },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
