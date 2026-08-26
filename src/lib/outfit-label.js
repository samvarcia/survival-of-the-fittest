/**
 * Display label for a contestant.
 * Placeholder numbers ("01", "contestant01") render as "01" with no @.
 * Real IG handles still render as "@handle".
 */
export function getOutfitLabel(outfit) {
  const raw = String(outfit?.participantInstagram || '').trim().replace(/^@/, '');
  if (!raw) {
    const id = Number(outfit?.id);
    return Number.isFinite(id) ? String(id).padStart(2, '0') : '';
  }

  const contestantMatch = raw.match(/^contestant0*(\d+)$/i);
  if (contestantMatch) {
    return contestantMatch[1].padStart(2, '0');
  }

  if (/^\d+$/.test(raw)) {
    return raw.padStart(2, '0');
  }

  return `@${raw}`;
}
