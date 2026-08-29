import { Redis } from '@upstash/redis';

const url =
  process.env.STORAGE_KV_REST_API_URL_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.STORAGE_KV_REST_API_URL_KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('Missing Redis credentials in environment');
  process.exit(1);
}

const outfitArg = process.argv.find((arg) => arg.startsWith('--outfit='));
const countArg = process.argv.find((arg) => arg.startsWith('--count='));
const outfitId = Number(outfitArg?.split('=')[1] ?? 26);
const voteCount = Number(countArg?.split('=')[1] ?? 100);

if (!Number.isFinite(outfitId) || !Number.isFinite(voteCount) || voteCount <= 0) {
  console.error('Usage: node scripts/add-paid-votes.mjs --outfit=26 --count=100');
  process.exit(1);
}

const redis = new Redis({ url, token });

const VOTES_PREFIX = 'approved_vote:';
const VOTE_STATS_KEY = 'voting_statistics';

const voteId = `admin_boost_${outfitId}_${Date.now()}`;
const voteData = {
  id: voteId,
  outfitId,
  username: 'admin_boost',
  timestamp: Date.now(),
  approved: true,
  verified: false,
  voteType: 'paid',
  voteCount,
  amount: 0,
  currency: 'CAD',
};

await redis.set(`${VOTES_PREFIX}${voteId}`, voteData);

const stats = await redis.get(VOTE_STATS_KEY);
let parsed = typeof stats === 'object' ? stats : JSON.parse(stats);
parsed = parsed.map((stat) =>
  stat.outfitId === outfitId
    ? { ...stat, votes: (stat.votes || 0) + voteCount }
    : stat,
);
await redis.set(VOTE_STATS_KEY, parsed);

const updated = parsed.find((stat) => stat.outfitId === outfitId);
console.log(
  JSON.stringify(
    {
      success: true,
      outfitId,
      addedVotes: voteCount,
      newTotal: updated?.votes ?? null,
      voteId,
    },
    null,
    2,
  ),
);
