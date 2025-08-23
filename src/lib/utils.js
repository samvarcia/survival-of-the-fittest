import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Cache for followers data
let followersCache = null;

// Load and parse followers CSV
export function loadFollowers() {
  if (followersCache) {
    return followersCache;
  }

  try {
    const csvPath = path.join(process.cwd(), 'src/data/followers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });

    if (results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
    }

    // Extract usernames and normalize them
    followersCache = results.data.map(row => {
      const username = row.username || row.handle || Object.values(row)[0];
      return username ? username.trim().toLowerCase().replace('@', '') : null;
    }).filter(Boolean);

    console.log(`Loaded ${followersCache.length} followers from CSV`);
    return followersCache;
  } catch (error) {
    console.error('Error loading followers CSV:', error);
    return [];
  }
}

// Check if a username is in the followers list
export function isVerifiedFollower(username) {
  if (!username) return false;
  
  const followers = loadFollowers();
  const normalizedUsername = username.trim().toLowerCase().replace('@', '');
  
  return followers.includes(normalizedUsername);
}

// Normalize Instagram username
export function normalizeUsername(username) {
  if (!username) return '';
  return username.trim().toLowerCase().replace('@', '');
}

// Validate Instagram username format
export function isValidUsername(username) {
  if (!username) return false;
  
  const normalized = normalizeUsername(username);
  
  // Instagram username rules:
  // - 1-30 characters
  // - Only letters, numbers, periods, and underscores
  // - Cannot start or end with a period
  // - Cannot have consecutive periods
  const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;
  
  return usernameRegex.test(normalized) && !normalized.startsWith('.');
}

// Format vote count for display
export function formatVoteCount(count) {
  if (count < 1000) return count.toString();
  if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
  return (count / 1000000).toFixed(1) + 'M';
}

// Calculate percentage
export function calculatePercentage(votes, total) {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
}

// Generate unique vote ID
export function generateVoteId(username) {
  return `${normalizeUsername(username)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sort outfits by vote count
export function sortByVotes(stats, descending = true) {
  return [...stats].sort((a, b) => {
    return descending ? b.votes - a.votes : a.votes - b.votes;
  });
}

// Get outfit by ID
export function getOutfitById(outfits, id) {
  return outfits.find(outfit => outfit.id === id);
}

// Debounce function for search/filtering
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Check if voting is currently active (you can modify this based on your needs)
export function isVotingActive() {
  // For now, always return true. You can add time-based logic here
  return true;
}