import { describe, it, expect } from "bun:test";
import { parseZipFilter, assembleIdeaScores, UNKNOWN_ZIP } from "./analyticsScoring";
import { computeScore } from "./scoring";

describe("parseZipFilter", () => {
  it("undefined selectedZips is inactive (no filter)", () => {
    expect(parseZipFilter(undefined)).toEqual({ active: false, realZips: [], includeUnknown: false });
  });

  it("an empty array is inactive (no filter)", () => {
    expect(parseZipFilter([])).toEqual({ active: false, realZips: [], includeUnknown: false });
  });

  it("real zips are collected and includeUnknown is false when UNKNOWN_ZIP isn't present", () => {
    expect(parseZipFilter(["10001", "20002"])).toEqual({
      active: true,
      realZips: ["10001", "20002"],
      includeUnknown: false,
    });
  });

  it("UNKNOWN_ZIP is stripped out of realZips and flips includeUnknown on", () => {
    expect(parseZipFilter([UNKNOWN_ZIP])).toEqual({ active: true, realZips: [], includeUnknown: true });
  });

  it("UNKNOWN_ZIP combined with real zips: stripped from realZips, includeUnknown true", () => {
    expect(parseZipFilter(["10001", UNKNOWN_ZIP, "20002"])).toEqual({
      active: true,
      realZips: ["10001", "20002"],
      includeUnknown: true,
    });
  });
});

describe("assembleIdeaScores", () => {
  it("every id in ideaIds appears, even with zero wins/losses", () => {
    const results = assembleIdeaScores(["a", "b"], new Map(), new Map());
    expect(results).toEqual([
      { ideaId: "a", wins: 0, losses: 0, score: 50, voteCount: 0 },
      { ideaId: "b", wins: 0, losses: 0, score: 50, voteCount: 0 },
    ]);
  });

  it("computes score/voteCount from the wins/losses maps", () => {
    const wins = new Map([["a", 3]]);
    const losses = new Map([["a", 1], ["b", 2]]);
    const results = assembleIdeaScores(["a", "b"], wins, losses);

    expect(results.find((r) => r.ideaId === "a")).toEqual({
      ideaId: "a",
      wins: 3,
      losses: 1,
      score: computeScore(3, 1),
      voteCount: 4,
    });
    expect(results.find((r) => r.ideaId === "b")).toEqual({
      ideaId: "b",
      wins: 0,
      losses: 2,
      score: computeScore(0, 2),
      voteCount: 2,
    });
  });

  it("ideas absent from both maps get score 50 and no divide-by-zero", () => {
    const results = assembleIdeaScores(["a", "b", "c"], new Map([["a", 5]]), new Map([["a", 5]]));
    const c = results.find((r) => r.ideaId === "c")!;
    expect(c).toEqual({ ideaId: "c", wins: 0, losses: 0, score: 50, voteCount: 0 });
  });

  it("sorts by score desc", () => {
    const wins = new Map([["a", 2], ["b", 0]]);
    const losses = new Map([["a", 0], ["b", 1]]);
    const results = assembleIdeaScores(["a", "b", "c"], wins, losses);
    // a: 2/0 (highest); c: 0/0 (score 50); b: 0/1 (lowest)
    expect(results.map((r) => r.ideaId)).toEqual(["a", "c", "b"]);
  });

  it("ties in score are broken by wins desc", () => {
    // computeScore(0,0) === computeScore(1,1) === 50
    const wins = new Map([["tie-one", 1]]);
    const losses = new Map([["tie-one", 1]]);
    const results = assembleIdeaScores(["tie-zero", "tie-one"], wins, losses);

    expect(results.every((r) => r.score === 50)).toBe(true);
    expect(results.map((r) => r.ideaId)).toEqual(["tie-one", "tie-zero"]);
  });
});
