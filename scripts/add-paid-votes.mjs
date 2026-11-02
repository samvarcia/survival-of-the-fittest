import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const outfitArg = process.argv.find((arg) => arg.startsWith('--outfit='));
const countArg = process.argv.find((arg) => arg.startsWith('--count='));
const outfitId = Number(outfitArg?.split('=')[1] ?? 1);
const voteCount = Number(countArg?.split('=')[1] ?? 100);

if (!Number.isFinite(outfitId) || !Number.isFinite(voteCount) || voteCount <= 0) {
  console.error('Usage: node scripts/add-paid-votes.mjs --outfit=1 --count=100');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: party, error: partyError } = await supabase
  .from('parties')
  .select('id')
  .eq('status', 'active')
  .maybeSingle();

if (partyError || !party) {
  console.error('No active party found', partyError);
  process.exit(1);
}

const voteId = `admin_boost_${outfitId}_${Date.now()}`;
const voteData = {
  id: voteId,
  party_id: party.id,
  outfit_id: outfitId,
  username: 'admin_boost',
  timestamp: Date.now(),
  approved: true,
  verified: false,
  vote_type: 'paid',
  vote_count: voteCount,
  amount: 0,
  currency: 'CAD',
};

const { error: voteError } = await supabase.from('votes').insert(voteData);
if (voteError) {
  console.error('Failed to insert vote', voteError);
  process.exit(1);
}

const { data: existing } = await supabase
  .from('vote_stats')
  .select('votes')
  .eq('party_id', party.id)
  .eq('outfit_id', outfitId)
  .maybeSingle();

const nextVotes = (Number(existing?.votes) || 0) + voteCount;
const { error: statsError } = await supabase.from('vote_stats').upsert({
  party_id: party.id,
  outfit_id: outfitId,
  votes: nextVotes,
});

if (statsError) {
  console.error('Failed to update stats', statsError);
  process.exit(1);
}

console.log(`Added ${voteCount} paid votes to outfit ${outfitId} on ${party.id} (total ${nextVotes})`);
