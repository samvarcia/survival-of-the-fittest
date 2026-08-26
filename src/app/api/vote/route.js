import { NextResponse } from 'next/server';
import { submitVote, getUserVote } from '@/lib/db-upstash';
import { isValidUsername, normalizeUsername } from '@/lib/utils';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRedisConfigured } from '@/lib/redis-config';
import { isVotingOpen } from '@/lib/voting-window';

export async function POST(request) {
  try {
    if (!isVotingOpen()) {
      return NextResponse.json(
        { success: false, error: 'Voting has ended' },
        { status: 403 }
      );
    }

    if (!isRedisConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Voting database not configured' },
        { status: 503 }
      );
    }

    const { outfitId, username, captchaToken } = await request.json();

    if (!outfitId || !username) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
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
        { status: 403 }
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username format' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    const existingVote = await getUserVote(normalizedUsername);
    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You have already voted' },
        { status: 409 }
      );
    }

    const voteData = await submitVote(outfitId, normalizedUsername, {
      voteType: 'free',
      voteCount: 1,
      amount: 0,
    });

    return NextResponse.json({
      success: true,
      vote: voteData,
      message: 'Vote submitted for approval',
    });
  } catch (error) {
    console.error('Vote API error:', error);

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username required' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);
    const userVote = await getUserVote(normalizedUsername);

    return NextResponse.json({
      success: true,
      hasVoted: !!userVote,
      vote: userVote,
    });
  } catch (error) {
    console.error('Get vote API error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to get vote status' },
      { status: 500 }
    );
  }
}
