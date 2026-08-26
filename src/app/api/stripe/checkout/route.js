import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRedisConfigured } from '@/lib/redis-config';
import { getUserVote } from '@/lib/db-upstash';
import { isValidUsername, normalizeUsername } from '@/lib/utils';
import { isValidOutfitId, normalizeOutfitId } from '@/lib/outfits';
import { getPaidPackByVotes } from '@/lib/vote-packs';
import { savePendingCheckout } from '@/lib/stripe-pending';

export async function POST(request) {
  try {
    if (!isRedisConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Voting database not configured' },
        { status: 503 },
      );
    }

    const { outfitId, username, votes, captchaToken } = await request.json();

    if (!outfitId || !username || !votes) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const pack = getPaidPackByVotes(votes);
    if (!pack?.stripeUrl) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote pack' },
        { status: 400 },
      );
    }

    if (!isValidOutfitId(outfitId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid contestant' },
        { status: 400 },
      );
    }

    const remoteIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const captchaValid = await verifyTurnstile(captchaToken, remoteIp);
    if (!captchaValid) {
      return NextResponse.json(
        { success: false, error: 'Captcha verification failed' },
        { status: 403 },
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username format' },
        { status: 400 },
      );
    }

    const normalizedUsername = normalizeUsername(username);
    const existingVote = await getUserVote(normalizedUsername);
    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You have already voted' },
        { status: 409 },
      );
    }

    const referenceId = randomUUID();
    await savePendingCheckout(referenceId, {
      outfitId: normalizeOutfitId(outfitId),
      username: normalizedUsername,
      voteCount: pack.votes,
      amount: pack.price,
      currency: pack.currency || 'CAD',
      stripeUrl: pack.stripeUrl,
      createdAt: Date.now(),
    });

    const checkoutUrl = new URL(pack.stripeUrl);
    checkoutUrl.searchParams.set('client_reference_id', referenceId);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl.toString(),
    });
  } catch (error) {
    console.error('Stripe checkout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start checkout' },
      { status: 500 },
    );
  }
}
