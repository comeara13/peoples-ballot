/**
 * Laplace-smoothed Bayesian win probability — same formula as allourideas.org.
 * Returns a score in the range (0, 100), starting at 50.0 with no votes.
 *
 * These pure functions are the canonical source of truth for the formula.
 * The SQL expressions in votes.ts must stay mathematically equivalent:
 *   winner SQL: (wins + 2.0) / (wins + losses + 3.0) * 100
 *   loser  SQL: (wins + 1.0) / (wins + losses + 3.0) * 100
 */

export function computeScore(wins: number, losses: number): number {
  return ((wins + 1) / (wins + losses + 2)) * 100;
}

export function scoreAfterWin(wins: number, losses: number): number {
  return computeScore(wins + 1, losses);
}

export function scoreAfterLoss(wins: number, losses: number): number {
  return computeScore(wins, losses + 1);
}
