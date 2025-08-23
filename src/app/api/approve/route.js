import { NextResponse } from 'next/server';
import { approveVote, rejectVote, getPendingVotes } from '@/lib/db';

// Simple admin auth (you might want to improve this for production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_PASSWORD;
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, voteId } = await request.json();

    if (!action || !voteId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;
    
    if (action === 'approve') {
      result = await approveVote(voteId);
    } else if (action === 'reject') {
      result = await rejectVote(voteId);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      vote: result
    });

  } catch (error) {
    console.error('Approve API error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process vote' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pendingVotes = await getPendingVotes();

    return NextResponse.json({
      success: true,
      votes: pendingVotes,
      count: pendingVotes.length
    });

  } catch (error) {
    console.error('Get pending votes API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get pending votes' },
      { status: 500 }
    );
  }
}