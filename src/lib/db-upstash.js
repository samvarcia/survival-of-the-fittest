// Complete rewrite - Final version to fix all Redis issues
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Clean key prefixes to avoid conflicts
const VOTES_PREFIX = 'approved_vote:';
const PENDING_PREFIX = 'pending_vote:';
const VOTE_STATS_KEY = 'voting_statistics';

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
    
    // Handle both object and string responses from Upstash
    if (typeof existingStats === 'object') {
      return existingStats;
    }
    
    try {
      return JSON.parse(existingStats);
    } catch (parseError) {
      console.warn('Failed to parse stats, reinitializing:', parseError);
      const fallbackStats = outfitIds.map(id => ({ outfitId: id, votes: 0 }));
      await redis.set(VOTE_STATS_KEY, fallbackStats);
      return fallbackStats;
    }
  } catch (error) {
    console.error('Error initializing vote stats:', error);
    const fallbackStats = outfitIds.map(id => ({ outfitId: id, votes: 0 }));
    await redis.set(VOTE_STATS_KEY, fallbackStats);
    return fallbackStats;
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

    const voteId = `${username}_${Date.now()}`;
    const voteData = {
      id: voteId,
      outfitId,
      username,
      timestamp: Date.now(),
      approved: isVerifiedFollower,
      verified: isVerifiedFollower
    };

    console.log(`Submitting vote for ${username}, isVerified: ${isVerifiedFollower}`);

    if (isVerifiedFollower) {
      // Add to approved votes
      console.log('Adding to approved votes');
      const key = `${VOTES_PREFIX}${voteId}`;
      await redis.set(key, voteData);
      await updateVoteStats(outfitId, 1);
      console.log('Approved vote added successfully: true');
    } else {
      // Add to pending votes
      console.log('Adding to pending votes');
      const key = `${PENDING_PREFIX}${voteId}`;
      await redis.set(key, voteData);
      
      // Verify it was saved
      const verification = await redis.get(key);
      const success = !!verification;
      console.log(`Pending vote added successfully: ${success}`);
      
      if (success) {
        console.log('Vote data saved:', voteData);
      }
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
    // Check approved votes first
    const approvedKeys = await redis.keys(`${VOTES_PREFIX}${username}_*`);
    for (const key of approvedKeys) {
      try {
        const vote = await redis.get(key);
        if (vote) {
          return typeof vote === 'object' ? vote : JSON.parse(vote);
        }
      } catch (parseError) {
        console.warn(`Failed to parse approved vote ${key}:`, parseError);
        continue;
      }
    }
    
    // Check pending votes
    const pendingKeys = await redis.keys(`${PENDING_PREFIX}${username}_*`);
    for (const key of pendingKeys) {
      try {
        const vote = await redis.get(key);
        if (vote) {
          return typeof vote === 'object' ? vote : JSON.parse(vote);
        }
      } catch (parseError) {
        console.warn(`Failed to parse pending vote ${key}:`, parseError);
        continue;
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
    const existingStats = await redis.get(VOTE_STATS_KEY);
    let stats = [];
    
    if (existingStats) {
      if (typeof existingStats === 'object') {
        stats = existingStats;
      } else {
        try {
          stats = JSON.parse(existingStats);
        } catch (parseError) {
          console.warn('Failed to parse stats, using empty array');
          stats = [];
        }
      }
    }
    
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
    
    if (!stats) {
      return [];
    }
    
    if (typeof stats === 'object') {
      return stats;
    }
    
    try {
      return JSON.parse(stats);
    } catch (parseError) {
      console.warn('Failed to parse stats, returning empty array');
      return [];
    }
  } catch (error) {
    console.error('Error getting vote stats:', error);
    return [];
  }
}

// Get pending votes for admin approval
export async function getPendingVotes() {
  try {
    console.log('Getting pending votes...');
    const pendingKeys = await redis.keys(`${PENDING_PREFIX}*`);
    console.log(`Found ${pendingKeys.length} pending keys:`, pendingKeys);
    
    const votes = [];
    
    for (const key of pendingKeys) {
      try {
        const vote = await redis.get(key);
        console.log(`Retrieved vote from ${key}:`, vote);
        
        if (vote) {
          const voteData = typeof vote === 'object' ? vote : JSON.parse(vote);
          votes.push(voteData);
        }
      } catch (parseError) {
        console.warn(`Failed to parse pending vote ${key}:`, parseError);
        continue;
      }
    }
    
    console.log(`Returning ${votes.length} pending votes`);
    return votes;
  } catch (error) {
    console.error('Error getting pending votes:', error);
    return [];
  }
}

// Approve a pending vote
export async function approveVote(voteId) {
  try {
    const pendingKey = `${PENDING_PREFIX}${voteId}`;
    const vote = await redis.get(pendingKey);
    
    if (!vote) {
      throw new Error('Vote not found');
    }

    const voteData = typeof vote === 'object' ? vote : JSON.parse(vote);
    
    // Move from pending to approved
    const approvedVote = { ...voteData, approved: true };
    const approvedKey = `${VOTES_PREFIX}${voteId}`;
    
    await redis.set(approvedKey, approvedVote);
    await redis.del(pendingKey);

    // Update stats
    await updateVoteStats(voteData.outfitId, 1);

    return approvedVote;
  } catch (error) {
    console.error('Error approving vote:', error);
    throw error;
  }
}

// Reject a pending vote
export async function rejectVote(voteId) {
  try {
    const pendingKey = `${PENDING_PREFIX}${voteId}`;
    const vote = await redis.get(pendingKey);
    
    if (!vote) {
      throw new Error('Vote not found');
    }

    const voteData = typeof vote === 'object' ? vote : JSON.parse(vote);
    await redis.del(pendingKey);
    return voteData;
  } catch (error) {
    console.error('Error rejecting vote:', error);
    throw error;
  }
}

// Get all approved votes
export async function getApprovedVotes() {
  try {
    const approvedKeys = await redis.keys(`${VOTES_PREFIX}*`);
    const votes = [];
    
    for (const key of approvedKeys) {
      try {
        const vote = await redis.get(key);
        if (vote) {
          const voteData = typeof vote === 'object' ? vote : JSON.parse(vote);
          votes.push(voteData);
        }
      } catch (parseError) {
        console.warn(`Failed to parse approved vote ${key}:`, parseError);
        continue;
      }
    }
    
    return votes;
  } catch (error) {
    console.error('Error getting approved votes:', error);
    return [];
  }
}