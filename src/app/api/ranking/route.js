import { NextResponse } from 'next/server';
import { getVoteStats, initializeVoteStats } from '@/lib/db-upstash';
import { isRedisConfigured } from '@/lib/redis-config';
import { outfits } from '@/data/outfits';

const TOP_N = 20;

export async function GET() {
  try {
    if (!isRedisConfigured()) {
      return NextResponse.json({ success: true, ranking: [] });
    }

    const outfitIds = outfits.map((outfit) => outfit.id);
    let stats = await getVoteStats();

    if (!stats || stats.length === 0) {
      stats = await initializeVoteStats(outfitIds);
    }

    const byId = new Map(stats.map((row) => [row.outfitId, Number(row.votes) || 0]));
    const ranking = outfits
      .map((outfit) => ({
        outfitId: outfit.id,
        votes: byId.get(outfit.id) || 0,
      }))
      .sort((a, b) => b.votes - a.votes || a.outfitId - b.outfitId)
      .slice(0, TOP_N)
      .map((row, index) => ({
        outfitId: row.outfitId,
        place: index + 1,
      }));

    return NextResponse.json({
      success: true,
      ranking,
    });
  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load ranking' },
      { status: 500 },
    );
  }
}
