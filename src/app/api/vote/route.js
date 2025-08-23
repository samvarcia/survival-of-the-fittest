import { NextResponse } from 'next/server';
import { submitVote, getUserVote } from '@/lib/db';
import { isVerifiedFollower, isValidUsername, normalizeUsername } from '@/lib/utils';

export async function POST(request) {
  try {
    const { outfitId, username } = await request.json();

    // Validation
    if (!outfitId || !username) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username format' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    // Check if user has already voted
    const existingVote = await getUserVote(normalizedUsername);
    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You have already voted' },
        { status: 409 }
      );
    }

    // Check if user is a verified follower
    const isFollower = isVerifiedFollower(normalizedUsername);

    // Submit vote
    const voteData = await submitVote(outfitId, normalizedUsername, isFollower);

    return NextResponse.json({
      success: true,
      vote: voteData,
      message: isFollower ? 'Vote recorded!' : 'Vote pending approval'
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
      vote: userVote
    });

  } catch (error) {
    console.error('Get vote API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get vote status' },
      { status: 500 }
    );
  }
}