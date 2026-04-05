/**
 * Compute confidence-weighted chance percentage.
 * Each vote is weighted by its confidence level (1–5).
 * Votes without a confidence level default to 3 (middle).
 */
export function getWeightedChance(prediction: {
  weighted_votes_yes?: number;
  weighted_votes_no?: number;
  total_votes_yes?: number;
  total_votes_no?: number;
}): { yesPct: number; noPct: number } {
  const wy = Number((prediction as any).weighted_votes_yes) || 0;
  const wn = Number((prediction as any).weighted_votes_no) || 0;
  const total = wy + wn;
  if (total > 0) {
    const yesPct = (wy / total) * 100;
    return { yesPct, noPct: 100 - yesPct };
  }
  // Fallback: unweighted if no weighted data
  const ty = prediction.total_votes_yes ?? 0;
  const tn = prediction.total_votes_no ?? 0;
  const t2 = ty + tn;
  if (t2 > 0) {
    const yesPct = (ty / t2) * 100;
    return { yesPct, noPct: 100 - yesPct };
  }
  return { yesPct: 50, noPct: 50 };
}
