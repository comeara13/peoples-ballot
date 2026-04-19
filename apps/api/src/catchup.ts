/**
 * Catchup sampling algorithm — adapted from allourideas.org pairwise-api.
 *
 * Pairs with fewer votes get higher weight, driving the system toward
 * showing under-represented pairs. New ideas are oversampled emergently
 * because all their pairs start with 0 votes.
 *
 * TAU (0.05) acts as a ceiling: all pairs with < 20 votes share equal weight.
 * Pairs with ≥ 20 votes are down-weighted as 1 / (votes_count + 1).
 */

export const TAU = 0.05;

/** Weight for a single pair given its historical vote count. */
export function catchupWeight(votesCount: number, tau = TAU): number {
  return Math.min(1 / (votesCount + 1), tau);
}

export interface WeightedPair {
  left: string;
  right: string;
  votesCount: number;
  weight: number;
}

/**
 * Build all canonical pairs from a set of idea IDs with their catchup weights.
 *
 * Sorts ideaIds lexicographically first so left < right in every pair,
 * satisfying the DB CHECK constraint on the prompts table.
 *
 * @param ideaIds       All active idea IDs for the bank
 * @param votesByKey    Map of "leftId|rightId" → votesCount (existing prompts only)
 */
export function buildPairWeights(
  ideaIds: string[],
  votesByKey: Map<string, number>,
  tau = TAU,
): WeightedPair[] {
  const sorted = [...ideaIds].sort();
  const pairs: WeightedPair[] = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const left = sorted[i];
      const right = sorted[j];
      const votesCount = votesByKey.get(`${left}|${right}`) ?? 0;
      pairs.push({ left, right, votesCount, weight: catchupWeight(votesCount, tau) });
    }
  }

  return pairs;
}

/**
 * Weighted random sample of k items without replacement (roulette-wheel selection).
 * Items are consumed from a mutable pool; higher-weight items are proportionally
 * more likely to be selected at each draw.
 */
export function weightedSample<T extends { weight: number }>(
  items: T[],
  k: number,
): T[] {
  const pool = [...items];
  const selected: T[] = [];

  while (selected.length < k && pool.length > 0) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      rand -= pool[i].weight;
      if (rand <= 0) {
        idx = i;
        break;
      }
    }
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}
