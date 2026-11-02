import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/supabase';
import {
  getActiveParty,
  getPartyById,
  getPartySummary,
  listParties,
  archiveActivePartyAndStartNext,
} from '@/lib/parties';
import {
  getApprovedVotes,
  getPendingVotes,
  getVoteStats,
} from '@/lib/db-upstash';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YVL';

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === ADMIN_PASSWORD;
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('id');

    if (partyId) {
      const party = await getPartyById(partyId);
      if (!party) {
        return NextResponse.json({ success: false, error: 'Party not found' }, { status: 404 });
      }

      const [summary, pending, approved, stats] = await Promise.all([
        getPartySummary(partyId),
        getPendingVotes(partyId),
        getApprovedVotes(partyId),
        getVoteStats(partyId),
      ]);

      return NextResponse.json({
        success: true,
        party,
        summary,
        pending,
        approved,
        stats,
      });
    }

    const [parties, active] = await Promise.all([listParties(), getActiveParty()]);
    const summaries = await Promise.all(
      parties.map(async (party) => ({
        ...party,
        summary: await getPartySummary(party.id),
      })),
    );

    return NextResponse.json({
      success: true,
      activePartyId: active?.id || null,
      parties: summaries,
    });
  } catch (error) {
    console.error('Parties API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load parties' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 },
      );
    }

    const body = await request.json();
    if (body.action !== 'archive_and_start') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const result = await archiveActivePartyAndStartNext({
      nextName: body.name,
      nextVotingEndAt: body.votingEndAt,
      nextIntro: body.intro,
      nextRankingLabel: body.rankingLabel,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Parties POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to archive party' },
      { status: 500 },
    );
  }
}
