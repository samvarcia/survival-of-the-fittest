import { NextResponse } from 'next/server';
import { getVoteStats, initializeVoteStats } from '@/lib/db';
import { outfits } from '@/data/outfits';

export async function GET() {
  try {
    // Initialize stats if they don't exist
    const outfitIds = outfits.map(outfit => outfit.id);
    let stats = await getVoteStats();
    
    if (!stats || stats.length === 0) {
      stats = await initializeVoteStats(outfitIds);
    }

    // Ensure all outfits have stats
    const existingIds = new Set(stats.map(stat => stat.outfitId));
    const missingIds = outfitIds.filter(id => !existingIds.has(id));
    
    if (missingIds.length > 0) {
      const missingStats = missingIds.map(id => ({ outfitId: id, votes: 0 }));
      stats = [...stats, ...missingStats];
      await initializeVoteStats(outfitIds);
    }

    // Calculate totals
    const totalVotes = stats.reduce((sum, stat) => sum + stat.votes, 0);
    
    // Add percentage to each stat
    const enrichedStats = stats.map(stat => ({
      ...stat,
      percentage: totalVotes > 0 ? Math.round((stat.votes / totalVotes) * 100) : 0
    }));

    return NextResponse.json({
      success: true,
      stats: enrichedStats,
      totalVotes,
      lastUpdated: Date.now()
    });

  } catch (error) {
    console.error('Stats API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}