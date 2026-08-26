import { outfits } from '@/data/outfits';

export function isValidOutfitId(outfitId) {
  const id = Number(outfitId);
  return outfits.some((outfit) => outfit.id === id);
}

export function normalizeOutfitId(outfitId) {
  return Number(outfitId);
}
