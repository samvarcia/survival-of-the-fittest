// Upstash Redis setup via Vercel Marketplace integration
import { Redis } from '@upstash/redis';

// Use fromEnv() which automatically reads environment variables
const redis = Redis.fromEnv();

// Vote storage keys
const VOTES_KEY = 'outfit_votes';
const PENDING_VOTES_KEY = 'pending_votes';
const VOTE_STATS_KEY = 'vote_stats';

// Initialize vote stats for all outfits
export async function initializeVoteStats(outfitIds) {
  try {
    const existingStats = await redis.get(VOTE_STATS_KEY);
    
    if (!existingStats) {
      const initialStats = outfitIds.map(id => ({
        outfitId: id,
        votes: 0
      }));
      
      await redis.set(VOTE_STATS_KEY, initialStats);
      return initialStats;
    }
    
    return existingStats;
  } catch (error) {
    console.error('Error initializing vote stats:', error);
    throw error;
  }
}

// Submit a vote
export async function submitVote(outfitId, username, isVerifiedFollower) {
  try {
    // Check if user already voted
    const existingVote = await getUserVote(username);
    if (existingVote) {
      throw new Error('User has already voted');
    }

    const voteData = {
      id: `${username}_${Date.now()}`,
      outfitId,
      username,
      timestamp: Date.now(),
      approved: isVerifiedFollower,
      verified: isVerifiedFollower
    };

    if (isVerifiedFollower) {
      // Add to approved votes and update stats immediately
      await redis.hset(VOTES_KEY, voteData.id, JSON.stringify(voteData));
      await updateVoteStats(outfitId, 1);
    } else {
      // Add to pending votes
      await redis.hset(PENDING_VOTES_KEY, voteData.id, JSON.stringify(voteData));
    }

    return voteData;
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
}

// Get user's vote
export async function getUserVote(username) {
  try {
    // Check approved votes
    const approvedVotes = await redis.hgetall(VOTES_KEY);
    if (approvedVotes) {
      for (const [key, voteStr] of Object.entries(approvedVotes)) {
        const vote = JSON.parse(voteStr);
        if (vote.username === username) {
          return vote;
        }
      }
    }

    // Check pending votes
    const pendingVotes = await redis.hgetall(PENDING_VOTES_KEY);
    if (pendingVotes) {
      for (const [key, voteStr] of Object.entries(pendingVotes)) {
        const vote = JSON.parse(voteStr);
        if (vote.username === username) {
          return vote;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

// Update vote statistics
export async function updateVoteStats(outfitId, increment = 1) {
  try {
    const stats = await redis.get(VOTE_STATS_KEY) || [];
    
    const updatedStats = stats.map(stat => 
      stat.outfitId === outfitId 
        ? { ...stat, votes: Math.max(0, stat.votes + increment) }
        : stat
    );

    await redis.set(VOTE_STATS_KEY, updatedStats);
    return updatedStats;
  } catch (error) {
    console.error('Error updating vote stats:', error);
    throw error;
  }
}

// Get current vote statistics
export async function getVoteStats() {
  try {
    const stats = await redis.get(VOTE_STATS_KEY);
    return stats || [];
  } catch (error) {
    console.error('Error getting vote stats:', error);
    return [];
  }
}

// Get pending votes for admin approval
export async function getPendingVotes() {
  try {
    const pendingVotes = await redis.hgetall(PENDING_VOTES_KEY);
    return Object.values(pendingVotes || {}).map(voteStr => JSON.parse(voteStr));
  } catch (error) {
    console.error('Error getting pending votes:', error);
    return [];
  }
}

// Approve a pending vote
export async function approveVote(voteId) {
  try {
    const voteStr = await redis.hget(PENDING_VOTES_KEY, voteId);
    if (!voteStr) {
      throw new Error('Vote not found');
    }

    const vote = JSON.parse(voteStr);
    
    // Move from pending to approved
    const approvedVote = { ...vote, approved: true };
    await redis.hset(VOTES_KEY, voteId, JSON.stringify(approvedVote));
    await redis.hdel(PENDING_VOTES_KEY, voteId);

    // Update stats
    await updateVoteStats(vote.outfitId, 1);

    return approvedVote;
  } catch (error) {
    console.error('Error approving vote:', error);
    throw error;
  }
}

// Reject a pending vote
export async function rejectVote(voteId) {
  try {
    const voteStr = await redis.hget(PENDING_VOTES_KEY, voteId);
    if (!voteStr) {
      throw new Error('Vote not found');
    }

    const vote = JSON.parse(voteStr);
    await redis.hdel(PENDING_VOTES_KEY, voteId);
    return vote;
  } catch (error) {
    console.error('Error rejecting vote:', error);
    throw error;
  }
}

// Get all approved votes
export async function getApprovedVotes() {
  try {
    const approvedVotes = await redis.hgetall(VOTES_KEY);
    return Object.values(approvedVotes || {}).map(voteStr => JSON.parse(voteStr));
  } catch (error) {
    console.error('Error getting approved votes:', error);
    return [];
  }
}