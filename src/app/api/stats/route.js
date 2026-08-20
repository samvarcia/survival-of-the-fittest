import { NextResponse } from 'next/server';
import { getVoteStats, initializeVoteStats } from '@/lib/db-upstash';
import { isRedisConfigured } from '@/lib/redis-config';
import { outfits } from '@/data/outfits';

function emptyStats() {
  return outfits.map((outfit) => ({
    outfitId: outfit.id,
    votes: 0,
    percentage: 0,
  }));
}

export async function GET() {
  try {
    if (!isRedisConfigured()) {
      return NextResponse.json({
        success: true,
        stats: emptyStats(),
        totalVotes: 0,
        lastUpdated: Date.now(),
        warning: 'Redis not configured',
      });
    }

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
    
    return NextResponse.json({
      success: true,
      stats: emptyStats(),
      totalVotes: 0,
      lastUpdated: Date.now(),
      warning: 'Failed to get statistics',
    });
  }
}
