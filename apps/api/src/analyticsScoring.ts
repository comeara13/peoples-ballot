/**
 * Pure helpers for the admin analytics table. The actual vote counting
 * (including any zip filtering) happens in SQL GROUP BY queries in
 * routers/analytics.ts — pulling every vote row into Node to aggregate in
 * JS doesn't scale with vote history size. What's left pure and worth
 * testing in isolation:
 *   - parseZipFilter: turns the selected-zips input into SQL-filter criteria
 *   - assembleIdeaScores: turns pre-aggregated wins/losses maps into the
 *     final sorted, scored idea list (including zero-vote ideas)
 */

import { computeScore } from "./scoring";

/** Sentinel selectable alongside real zips to include votes with no attributable zip. */
export const UNKNOWN_ZIP = "UNKNOWN";

export interface ZipFilter {
  /** false means no filtering — every vote counts, regardless of zip. */
  active: boolean;
  /** Real zip codes to match (UNKNOWN_ZIP stripped out). */
  realZips: string[];
  /** Whether votes with no attributable zip (null) should also count. */
  includeUnknown: boolean;
}

/** Parses the raw selectedZips input into structured SQL-filter criteria. */
export function parseZipFilter(selectedZips?: string[]): ZipFilter {
  if (!selectedZips || selectedZips.length === 0) {
    return { active: false, realZips: [], includeUnknown: false };
  }
  return {
    active: true,
    realZips: selectedZips.filter((zip) => zip !== UNKNOWN_ZIP),
    includeUnknown: selectedZips.includes(UNKNOWN_ZIP),
  };
}

export interface IdeaScore {
  ideaId: string;
  wins: number;
  losses: number;
  score: number;
  voteCount: number;
}

/**
 * Assembles the final per-idea score list from pre-aggregated win/loss
 * counts (already filtered by zip in SQL, if a filter was active).
 *
 * Every id in `ideaIds` appears in the result, even with zero votes.
 * Sorted by score desc, ties broken by wins desc (matches ideaBanks.ts).
 */
export function assembleIdeaScores(
  ideaIds: string[],
  winsByIdea: Map<string, number>,
  lossesByIdea: Map<string, number>,
): IdeaScore[] {
  return ideaIds
    .map((ideaId) => {
      const wins = winsByIdea.get(ideaId) ?? 0;
      const losses = lossesByIdea.get(ideaId) ?? 0;
      return { ideaId, wins, losses, score: computeScore(wins, losses), voteCount: wins + losses };
    })
    .sort((a, b) => b.score - a.score || b.wins - a.wins);
}
