import { VOTE_PACKS } from '@/data/votePacks';

export function getPaidPackByVotes(votes) {
  const count = Number(votes);
  return VOTE_PACKS.find((pack) => pack.price > 0 && pack.votes === count) || null;
}

export function packAmountInCents(pack) {
  return Math.round(Number(pack.price) * 100);
}
