import { getServiceSupabase } from '@/lib/supabase';
import { getVoteCount } from '@/lib/vote-meta';
import { requireActiveParty } from '@/lib/parties';
import { outfits } from '@/data/outfits';

function mapVote(row) {
  if (!row) return null;
  return {
    id: row.id,
    outfitId: row.outfit_id,
    username: row.username,
    timestamp: Number(row.timestamp),
    approved: Boolean(row.approved),
    verified: Boolean(row.verified),
    voteType: row.vote_type || 'free',
    voteCount: Number(row.vote_count) || 1,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'CAD',
    ...(row.stripe_session_id ? { stripeSessionId: row.stripe_session_id } : {}),
    partyId: row.party_id,
  };
}

async function ensureStatsRows(partyId, outfitIds = outfits.map((o) => o.id)) {
  const supabase = getServiceSupabase();
  const rows = outfitIds.map((outfitId) => ({
    party_id: partyId,
    outfit_id: outfitId,
    votes: 0,
  }));

  const { error } = await supabase.from('vote_stats').upsert(rows, {
    onConflict: 'party_id,outfit_id',
    ignoreDuplicates: true,
  });

  if (error) throw error;
}

export async function initializeVoteStats(outfitIds) {
  const party = await requireActiveParty();
  await ensureStatsRows(party.id, outfitIds);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('vote_stats')
    .select('outfit_id, votes')
    .eq('party_id', party.id);

  if (error) throw error;

  const byId = new Map((data || []).map((row) => [row.outfit_id, row.votes]));
  return outfitIds.map((outfitId) => ({
    outfitId,
    votes: Number(byId.get(outfitId)) || 0,
  }));
}

export async function submitVote(outfitId, username, options = {}) {
  const party = await requireActiveParty();
  const supabase = getServiceSupabase();
  const voteType = options.voteType === 'paid' ? 'paid' : 'free';

  if (voteType === 'free') {
    const existingVote = await getUserVote(username);
    if (existingVote) {
      throw new Error('User has already voted');
    }
  }

  const voteCount = Math.max(1, Number(options.voteCount) || 1);
  const amount = Math.max(0, Number(options.amount) || 0);
  const currency = options.currency || 'CAD';
  const stripeSessionId = options.stripeSessionId || null;
  const voteId = `${username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const row = {
    id: voteId,
    party_id: party.id,
    outfit_id: Number(outfitId),
    username,
    timestamp: Date.now(),
    approved: false,
    verified: false,
    vote_type: voteType,
    vote_count: voteCount,
    amount,
    currency,
    stripe_session_id: stripeSessionId,
  };

  const { data, error } = await supabase.from('votes').insert(row).select('*').single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('User has already voted');
    }
    throw error;
  }

  return mapVote(data);
}

export async function getUserVote(username) {
  const party = await requireActiveParty();
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('party_id', party.id)
    .eq('username', username)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return mapVote(data);
}

export async function updateVoteStats(outfitId, increment = 1) {
  const party = await requireActiveParty();
  await ensureStatsRows(party.id);

  const supabase = getServiceSupabase();
  const { data: existing, error: readError } = await supabase
    .from('vote_stats')
    .select('votes')
    .eq('party_id', party.id)
    .eq('outfit_id', Number(outfitId))
    .maybeSingle();

  if (readError) throw readError;

  const nextVotes = Math.max(0, (Number(existing?.votes) || 0) + increment);
  const { error: writeError } = await supabase.from('vote_stats').upsert({
    party_id: party.id,
    outfit_id: Number(outfitId),
    votes: nextVotes,
  });

  if (writeError) throw writeError;
  return getVoteStats();
}

export async function getVoteStats(partyId) {
  const party = partyId ? { id: partyId } : await requireActiveParty();
  await ensureStatsRows(party.id);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('vote_stats')
    .select('outfit_id, votes')
    .eq('party_id', party.id);

  if (error) throw error;

  return (data || []).map((row) => ({
    outfitId: row.outfit_id,
    votes: Number(row.votes) || 0,
  }));
}

export async function getPendingVotes(partyId) {
  const party = partyId ? { id: partyId } : await requireActiveParty();
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('party_id', party.id)
    .eq('approved', false)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapVote);
}

export async function getApprovedVotes(partyId) {
  const party = partyId ? { id: partyId } : await requireActiveParty();
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('party_id', party.id)
    .eq('approved', true)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapVote);
}

export async function approveVote(voteId) {
  const supabase = getServiceSupabase();
  const { data: vote, error } = await supabase
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .maybeSingle();

  if (error) throw error;
  if (!vote) throw new Error('Vote not found');
  if (vote.approved) return mapVote(vote);

  const { data: updated, error: updateError } = await supabase
    .from('votes')
    .update({ approved: true })
    .eq('id', voteId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  await updateVoteStatsForParty(vote.party_id, vote.outfit_id, getVoteCount(mapVote(vote)));
  return mapVote(updated);
}

export async function rejectVote(voteId) {
  const supabase = getServiceSupabase();
  const { data: vote, error } = await supabase
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .maybeSingle();

  if (error) throw error;
  if (!vote) throw new Error('Vote not found');
  if (vote.approved) throw new Error('Cannot reject an approved vote — remove it instead');

  const { error: deleteError } = await supabase.from('votes').delete().eq('id', voteId);
  if (deleteError) throw deleteError;
  return mapVote(vote);
}

export async function removeVote(voteId) {
  const supabase = getServiceSupabase();
  const { data: vote, error } = await supabase
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .maybeSingle();

  if (error) throw error;
  if (!vote) throw new Error('Vote not found');

  const { error: deleteError } = await supabase.from('votes').delete().eq('id', voteId);
  if (deleteError) throw deleteError;

  if (vote.approved) {
    await updateVoteStatsForParty(
      vote.party_id,
      vote.outfit_id,
      -getVoteCount(mapVote(vote)),
    );
    return { ...mapVote(vote), removedFrom: 'approved' };
  }

  return { ...mapVote(vote), removedFrom: 'pending' };
}

async function updateVoteStatsForParty(partyId, outfitId, increment) {
  const supabase = getServiceSupabase();
  await ensureStatsRows(partyId);

  const { data: existing, error: readError } = await supabase
    .from('vote_stats')
    .select('votes')
    .eq('party_id', partyId)
    .eq('outfit_id', Number(outfitId))
    .maybeSingle();

  if (readError) throw readError;

  const nextVotes = Math.max(0, (Number(existing?.votes) || 0) + increment);
  const { error: writeError } = await supabase.from('vote_stats').upsert({
    party_id: partyId,
    outfit_id: Number(outfitId),
    votes: nextVotes,
  });

  if (writeError) throw writeError;
}
