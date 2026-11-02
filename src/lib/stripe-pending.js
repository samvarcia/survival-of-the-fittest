import { getServiceSupabase } from '@/lib/supabase';
import { requireActiveParty } from '@/lib/parties';

const CHECKOUT_TTL_MS = 60 * 60 * 2 * 1000;

export async function savePendingCheckout(referenceId, data) {
  const party = await requireActiveParty();
  const supabase = getServiceSupabase();
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS).toISOString();

  const { error } = await supabase.from('checkout_pending').upsert({
    reference_id: referenceId,
    party_id: party.id,
    outfit_id: Number(data.outfitId),
    username: data.username,
    vote_count: Number(data.voteCount),
    amount: Number(data.amount),
    currency: data.currency || 'CAD',
    stripe_url: data.stripeUrl || null,
    created_at: new Date(data.createdAt || Date.now()).toISOString(),
    expires_at: expiresAt,
  });

  if (error) throw error;
}

export async function getPendingCheckout(referenceId) {
  if (!referenceId) return null;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('checkout_pending')
    .select('*')
    .eq('reference_id', referenceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    await deletePendingCheckout(referenceId);
    return null;
  }

  return {
    outfitId: data.outfit_id,
    username: data.username,
    voteCount: data.vote_count,
    amount: Number(data.amount),
    currency: data.currency || 'CAD',
    stripeUrl: data.stripe_url,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    partyId: data.party_id,
  };
}

export async function deletePendingCheckout(referenceId) {
  if (!referenceId) return;
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('checkout_pending')
    .delete()
    .eq('reference_id', referenceId);
  if (error) throw error;
}

/** Returns true if this session was newly claimed (not already processed). */
export async function claimStripeSession(sessionId) {
  if (!sessionId) return false;
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('stripe_processed').insert({
    session_id: sessionId,
    processed_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}
