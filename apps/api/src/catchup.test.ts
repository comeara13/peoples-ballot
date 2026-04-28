import { describe, it, expect } from "bun:test";
import { TAU, catchupWeight, buildPairWeights, weightedSample } from "./catchup";

// ─── catchupWeight ────────────────────────────────────────────────────────────

describe("catchupWeight", () => {
  it("returns tau for pairs with 0 votes", () => {
    expect(catchupWeight(0)).toBe(TAU);
  });

  it("returns tau for pairs with votes_count < 20 (ceiling in effect)", () => {
    // tau = 0.05; 1/(votes+1) > 0.05 while votes < 19
    for (const v of [0, 1, 5, 10, 18]) {
      expect(catchupWeight(v)).toBe(TAU);
    }
  });

  it("returns exactly tau at the boundary (votes=19: 1/20 = 0.05)", () => {
    expect(catchupWeight(19)).toBe(TAU);
  });

  it("drops below tau for votes_count >= 20", () => {
    expect(catchupWeight(20)).toBeLessThan(TAU); // 1/21 ≈ 0.0476
    expect(catchupWeight(99)).toBeLessThan(TAU); // 1/100 = 0.01
  });

  it("is strictly decreasing above the tau ceiling", () => {
    expect(catchupWeight(20)).toBeGreaterThan(catchupWeight(50));
    expect(catchupWeight(50)).toBeGreaterThan(catchupWeight(100));
  });

  it("respects a custom tau parameter", () => {
    expect(catchupWeight(0, 0.1)).toBe(0.1);
    expect(catchupWeight(100, 0.1)).toBeLessThan(0.1);
  });
});

// ─── buildPairWeights ─────────────────────────────────────────────────────────

describe("buildPairWeights", () => {
  const ids = ["d", "b", "a", "c"]; // intentionally unsorted

  it("produces n*(n-1)/2 pairs for n ideas", () => {
    const pairs = buildPairWeights(ids, new Map());
    expect(pairs.length).toBe(6); // 4*3/2
  });

  it("enforces canonical left < right ordering on every pair", () => {
    const pairs = buildPairWeights(ids, new Map());
    for (const p of pairs) {
      expect(p.left < p.right).toBe(true);
    }
  });

  it("assigns tau weight to pairs with no vote history", () => {
    const pairs = buildPairWeights(ids, new Map());
    for (const p of pairs) {
      expect(p.weight).toBe(TAU);
      expect(p.votesCount).toBe(0);
    }
  });

  it("uses votes_count from the provided map", () => {
    const map = new Map([["a|b", 50]]); // 1/(50+1) ≈ 0.0196
    const pairs = buildPairWeights(ids, map);
    const ab = pairs.find((p) => p.left === "a" && p.right === "b")!;
    expect(ab.votesCount).toBe(50);
    expect(ab.weight).toBeCloseTo(1 / 51, 6);
  });

  it("gives high-vote pairs lower weight than unvoted pairs", () => {
    const map = new Map([["a|b", 100]]);
    const pairs = buildPairWeights(ids, map);
    const ab = pairs.find((p) => p.left === "a" && p.right === "b")!;
    const ac = pairs.find((p) => p.left === "a" && p.right === "c")!;
    expect(ab.weight).toBeLessThan(ac.weight);
  });

  it("returns empty array for fewer than 2 ideas", () => {
    expect(buildPairWeights([], new Map())).toHaveLength(0);
    expect(buildPairWeights(["x"], new Map())).toHaveLength(0);
  });
});

// ─── weightedSample ───────────────────────────────────────────────────────────

describe("weightedSample", () => {
  const items = [
    { label: "a", weight: 1 },
    { label: "b", weight: 1 },
    { label: "c", weight: 1 },
    { label: "d", weight: 1 },
    { label: "e", weight: 1 },
  ];

  it("returns exactly k items", () => {
    expect(weightedSample(items, 3)).toHaveLength(3);
    expect(weightedSample(items, 1)).toHaveLength(1);
    expect(weightedSample(items, 5)).toHaveLength(5);
  });

  it("never returns duplicate items", () => {
    for (let i = 0; i < 50; i++) {
      const sample = weightedSample(items, 3);
      const labels = sample.map((x) => x.label);
      expect(new Set(labels).size).toBe(3);
    }
  });

  it("returns all items when k >= pool size", () => {
    const sample = weightedSample(items, 10);
    expect(sample).toHaveLength(5);
  });

  it("returns empty array for k=0", () => {
    expect(weightedSample(items, 0)).toHaveLength(0);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    weightedSample(items, 3);
    expect(items).toHaveLength(original.length);
  });
});

// ─── Algorithm integration: catchup actually used ────────────────────────────

describe("catchup algorithm integration", () => {
  it("heavily-voted pairs are sampled less frequently than unvoted pairs", () => {
    // 4 ideas: 6 pairs total. Pair (a,b) has 100 votes → low weight.
    // Other 5 pairs have 0 votes → weight = tau.
    const ids = ["a", "b", "c", "d"];
    const votesByKey = new Map([["a|b", 100]]);
    const pairs = buildPairWeights(ids, votesByKey);

    const RUNS = 2000;
    let abCount = 0;
    let acCount = 0;

    for (let i = 0; i < RUNS; i++) {
      const selected = weightedSample(pairs, 3);
      if (selected.some((p) => p.left === "a" && p.right === "b")) abCount++;
      if (selected.some((p) => p.left === "a" && p.right === "c")) acCount++;
    }

    // (a,b) weight ≈ 1/101 ≈ 0.0099; others = 0.05
    // P(a,b selected in 3 of 6) ≈ much lower than P(a,c selected)
    // Rough expected rates: a,b ≈ 5%, a,c ≈ 45% — use loose bounds
    expect(abCount / RUNS).toBeLessThan(0.2);
    expect(acCount / RUNS).toBeGreaterThan(0.3);
  });

  it("new ideas (all pairs unvoted) get equal sampling probability", () => {
    const ids = ["a", "b", "c", "d"];
    const pairs = buildPairWeights(ids, new Map()); // all unvoted

    const counts = new Map<string, number>();
    const RUNS = 3000;

    for (let i = 0; i < RUNS; i++) {
      const selected = weightedSample(pairs, 1);
      const key = `${selected[0].left}|${selected[0].right}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // All 6 pairs should appear with roughly equal frequency (~1/6 ≈ 16.7%)
    for (const [, c] of counts) {
      expect(c / RUNS).toBeGreaterThan(0.08);
      expect(c / RUNS).toBeLessThan(0.28);
    }
  });

  it("high-vote ideas accumulate lower average weight across their pairs", () => {
    // Idea 'a' appears in pairs with 'b','c','d' — all heavily voted.
    // Idea 'e' is new — all its pairs are unvoted.
    const ids = ["a", "b", "c", "d", "e"];
    const votesByKey = new Map([
      ["a|b", 100],
      ["a|c", 100],
      ["a|d", 100],
      ["b|c", 100],
      ["b|d", 100],
      ["c|d", 100],
    ]);
    const pairs = buildPairWeights(ids, votesByKey);

    const involving = (id: string) => pairs.filter((p) => p.left === id || p.right === id);

    const avgWeight = (ps: typeof pairs) => ps.reduce((s, p) => s + p.weight, 0) / ps.length;

    expect(avgWeight(involving("e"))).toBeGreaterThan(avgWeight(involving("a")));
  });
});
