import { getServiceSupabase } from '@/lib/supabase';
import { outfits as codeOutfits } from '@/data/outfits';

function mapParty(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    votingEndAt: row.voting_end_at,
    intro: row.intro,
    rankingLabel: row.ranking_label || 'RANKING',
    outfits: Array.isArray(row.outfits) ? row.outfits : [],
    notes: row.notes || '',
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export async function getActiveParty() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return mapParty(data);
}

export async function requireActiveParty() {
  const party = await getActiveParty();
  if (!party) throw new Error('No active party configured');
  return party;
}

export async function listParties() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapParty);
}

export async function getPartyById(partyId) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .maybeSingle();

  if (error) throw error;
  return mapParty(data);
}

export async function getPartySummary(partyId) {
  const supabase = getServiceSupabase();
  const [{ data: stats, error: statsError }, { count: approvedCount, error: approvedError }, { count: pendingCount, error: pendingError }] =
    await Promise.all([
      supabase.from('vote_stats').select('outfit_id, votes').eq('party_id', partyId),
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', partyId)
        .eq('approved', true),
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', partyId)
        .eq('approved', false),
    ]);

  if (statsError) throw statsError;
  if (approvedError) throw approvedError;
  if (pendingError) throw pendingError;

  const totalVotes = (stats || []).reduce((sum, row) => sum + (Number(row.votes) || 0), 0);

  return {
    totalVotes,
    approvedBallots: approvedCount || 0,
    pendingBallots: pendingCount || 0,
    stats: stats || [],
  };
}

/**
 * Snapshot the live code outfits into the active party, archive it, open a new active party.
 */
export async function archiveActivePartyAndStartNext({
  nextName,
  nextVotingEndAt,
  nextIntro,
  nextRankingLabel = 'RANKING',
  nextOutfits = [],
} = {}) {
  const supabase = getServiceSupabase();
  const active = await requireActiveParty();

  const snapshotOutfits =
    Array.isArray(active.outfits) && active.outfits.length > 0 ? active.outfits : codeOutfits;

  const { error: archiveError } = await supabase
    .from('parties')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      outfits: snapshotOutfits,
    })
    .eq('id', active.id);

  if (archiveError) throw archiveError;

  const nextId = `party-${Date.now()}`;
  const { data: created, error: createError } = await supabase
    .from('parties')
    .insert({
      id: nextId,
      name: nextName || `Party ${new Date().toISOString().slice(0, 10)}`,
      status: 'active',
      voting_end_at: nextVotingEndAt || null,
      intro: nextIntro || active.intro,
      ranking_label: nextRankingLabel,
      outfits: nextOutfits,
      notes: '',
    })
    .select('*')
    .single();

  if (createError) throw createError;

  return {
    archived: { ...active, outfits: snapshotOutfits, status: 'archived' },
    active: mapParty(created),
  };
}
