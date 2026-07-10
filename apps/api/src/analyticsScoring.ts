/**
 * Zip-filtered idea score aggregation for the admin analytics table.
 *
 * Pure function, no I/O: routers/analytics.ts fetches ideas + vote rows
 * (each vote already joined out to the voter's zip, or null if the vote
 * can't be attributed to one) and hands them here. Kept separate from the
 * db layer so the aggregation/filtering logic can be unit tested directly,
 * the same way scoring.ts and catchup.ts are.
 */

import { computeScore } from "./scoring";

/** Sentinel selectable alongside real zips to include votes with no attributable zip. */
export const UNKNOWN_ZIP = "UNKNOWN";

export interface ZipFilteredVote {
  selection: "left" | "right"; // cant_decide votes are filtered out before reaching this function
  leftIdeaId: string;
  rightIdeaId: string;
  zip: string | null; // null = anonymous ballot, or voter has no zip on file
}

export interface IdeaScore {
  ideaId: string;
  wins: number;
  losses: number;
  score: number;
  voteCount: number;
}

/**
 * Computes wins/losses/score/voteCount per idea, restricted to votes whose
 * zip is in `selectedZips` (UNKNOWN_ZIP includes votes with zip === null).
 * An empty/undefined selectedZips means no filtering — every vote counts.
 *
 * Every id in `ideaIds` appears in the result, even with zero votes.
 * Sorted by score desc, ties broken by wins desc (matches ideaBanks.ts).
 */
export function computeZipFilteredScores(
  ideaIds: string[],
  votes: ZipFilteredVote[],
  selectedZips?: string[],
): IdeaScore[] {
  const filtered = filterVotesByZip(votes, selectedZips);

  const winsMap = new Map<string, number>();
  const lossesMap = new Map<string, number>();

  for (const vote of filtered) {
    const winnerId = vote.selection === "left" ? vote.leftIdeaId : vote.rightIdeaId;
    const loserId = vote.selection === "left" ? vote.rightIdeaId : vote.leftIdeaId;
    winsMap.set(winnerId, (winsMap.get(winnerId) ?? 0) + 1);
    lossesMap.set(loserId, (lossesMap.get(loserId) ?? 0) + 1);
  }

  return ideaIds
    .map((ideaId) => {
      const wins = winsMap.get(ideaId) ?? 0;
      const losses = lossesMap.get(ideaId) ?? 0;
      return { ideaId, wins, losses, score: computeScore(wins, losses), voteCount: wins + losses };
    })
    .sort((a, b) => b.score - a.score || b.wins - a.wins);
}

function filterVotesByZip(votes: ZipFilteredVote[], selectedZips?: string[]): ZipFilteredVote[] {
  if (!selectedZips || selectedZips.length === 0) return votes;

  const includeUnknown = selectedZips.includes(UNKNOWN_ZIP);
  const realZips = new Set(selectedZips.filter((zip) => zip !== UNKNOWN_ZIP));

  return votes.filter((vote) => (vote.zip === null ? includeUnknown : realZips.has(vote.zip)));
}
