import { describe, it, expect } from "bun:test";
import { computeZipFilteredScores, UNKNOWN_ZIP, type ZipFilteredVote } from "./analyticsScoring";
import { computeScore } from "./scoring";

// idea "a" beats "b" from zip 10001, "b" beats "a" from zip 20002, and "a" beats "b" again anonymously (zip null).
// idea "a" also beats "c" once, from zip 10001.
const votes: ZipFilteredVote[] = [
  { selection: "left", leftIdeaId: "a", rightIdeaId: "b", zip: "10001" },
  { selection: "right", leftIdeaId: "a", rightIdeaId: "b", zip: "20002" },
  { selection: "left", leftIdeaId: "a", rightIdeaId: "b", zip: null },
  { selection: "left", leftIdeaId: "a", rightIdeaId: "c", zip: "10001" },
];

function scoreOf(results: ReturnType<typeof computeZipFilteredScores>, ideaId: string) {
  const found = results.find((r) => r.ideaId === ideaId);
  if (!found) throw new Error(`no result for ${ideaId}`);
  return found;
}

describe("computeZipFilteredScores", () => {
  it("with no filter, counts every vote (matches the unfiltered baseline)", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, undefined);

    expect(scoreOf(results, "a")).toEqual({
      ideaId: "a",
      wins: 3,
      losses: 1,
      score: computeScore(3, 1),
      voteCount: 4,
    });
    expect(scoreOf(results, "b")).toEqual({
      ideaId: "b",
      wins: 1,
      losses: 2,
      score: computeScore(1, 2),
      voteCount: 3,
    });
    expect(scoreOf(results, "c")).toEqual({
      ideaId: "c",
      wins: 0,
      losses: 1,
      score: computeScore(0, 1),
      voteCount: 1,
    });
  });

  it("an empty selectedZips array behaves the same as undefined (no filter)", () => {
    const withUndefined = computeZipFilteredScores(["a", "b", "c"], votes, undefined);
    const withEmpty = computeZipFilteredScores(["a", "b", "c"], votes, []);
    expect(withEmpty).toEqual(withUndefined);
  });

  it("filtering to a single zip only counts that zip's votes, wins and losses alike", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, ["10001"]);

    // Only the a-beats-b (10001) and a-beats-c (10001) votes count.
    expect(scoreOf(results, "a")).toMatchObject({ wins: 2, losses: 0, voteCount: 2 });
    expect(scoreOf(results, "b")).toMatchObject({ wins: 0, losses: 1, voteCount: 1 });
    expect(scoreOf(results, "c")).toMatchObject({ wins: 0, losses: 1, voteCount: 1 });
  });

  it("filtering to multiple zips unions their votes", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, ["10001", "20002"]);

    // 10001: a beats b, a beats c. 20002: b beats a.
    expect(scoreOf(results, "a")).toMatchObject({ wins: 2, losses: 1, voteCount: 3 });
    expect(scoreOf(results, "b")).toMatchObject({ wins: 1, losses: 1, voteCount: 2 });
    expect(scoreOf(results, "c")).toMatchObject({ wins: 0, losses: 1, voteCount: 1 });
  });

  it("UNKNOWN_ZIP alone only counts votes with no attributable zip", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, [UNKNOWN_ZIP]);

    expect(scoreOf(results, "a")).toMatchObject({ wins: 1, losses: 0, voteCount: 1 });
    expect(scoreOf(results, "b")).toMatchObject({ wins: 0, losses: 1, voteCount: 1 });
    expect(scoreOf(results, "c")).toMatchObject({ wins: 0, losses: 0, voteCount: 0 });
  });

  it("UNKNOWN_ZIP combined with a real zip unions both", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, [UNKNOWN_ZIP, "20002"]);

    // null-zip: a beats b. 20002: b beats a.
    expect(scoreOf(results, "a")).toMatchObject({ wins: 1, losses: 1, voteCount: 2 });
    expect(scoreOf(results, "b")).toMatchObject({ wins: 1, losses: 1, voteCount: 2 });
    expect(scoreOf(results, "c")).toMatchObject({ wins: 0, losses: 0, voteCount: 0 });
  });

  it("an idea with zero matching votes after filtering gets score 50 and no divide-by-zero", () => {
    const results = computeZipFilteredScores(["a", "b", "c"], votes, ["99999"]);

    for (const ideaId of ["a", "b", "c"]) {
      expect(scoreOf(results, ideaId)).toEqual({ ideaId, wins: 0, losses: 0, score: 50, voteCount: 0 });
    }
  });

  it("every id in ideaIds appears in the result, even ones with no votes at all", () => {
    const results = computeZipFilteredScores(["a", "b", "c", "d-never-voted-on"], votes, undefined);
    expect(results.map((r) => r.ideaId).sort()).toEqual(["a", "b", "c", "d-never-voted-on"].sort());
    expect(scoreOf(results, "d-never-voted-on")).toEqual({
      ideaId: "d-never-voted-on",
      wins: 0,
      losses: 0,
      score: 50,
      voteCount: 0,
    });
  });

  it("sorts by score desc", () => {
    // Under the 10001 filter: a has 2 wins/0 losses (highest score); b and c
    // both have 0 wins/1 loss (tied) — stable sort keeps them in ideaIds order.
    const results = computeZipFilteredScores(["a", "b", "c"], votes, ["10001"]);
    expect(results.map((r) => r.ideaId)).toEqual(["a", "b", "c"]);
  });

  it("ties in score are broken by wins desc", () => {
    // computeScore(0,0) === computeScore(1,1) === 50 — construct a 3-way tie on score
    // where "tie-zero" has 0 wins and "tie-one"/"filler" each have 1 win, 1 loss.
    const tieVotes: ZipFilteredVote[] = [
      { selection: "left", leftIdeaId: "tie-one", rightIdeaId: "filler", zip: "1" },
      { selection: "left", leftIdeaId: "filler", rightIdeaId: "tie-one", zip: "1" },
    ];
    const results = computeZipFilteredScores(["tie-zero", "tie-one", "filler"], tieVotes, undefined);

    expect(results.every((r) => r.score === 50)).toBe(true);
    const rank = (id: string) => results.findIndex((r) => r.ideaId === id);
    expect(rank("tie-one")).toBeLessThan(rank("tie-zero"));
    expect(rank("filler")).toBeLessThan(rank("tie-zero"));
  });
});
