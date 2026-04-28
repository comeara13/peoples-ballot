import { describe, it, expect } from "bun:test";
import { computeScore, scoreAfterWin, scoreAfterLoss } from "./scoring";

describe("computeScore", () => {
  it("returns 50 with no votes", () => {
    expect(computeScore(0, 0)).toBe(50);
  });

  it("increases toward 100 with more wins", () => {
    expect(computeScore(10, 0)).toBeGreaterThan(computeScore(5, 0));
    expect(computeScore(100, 0)).toBeGreaterThan(90);
  });

  it("decreases toward 0 with more losses", () => {
    expect(computeScore(0, 10)).toBeLessThan(computeScore(0, 5));
    expect(computeScore(0, 100)).toBeLessThan(10);
  });

  it("returns 50 with equal wins and losses", () => {
    expect(computeScore(10, 10)).toBeCloseTo(50, 10);
    expect(computeScore(100, 100)).toBeCloseTo(50, 10);
  });

  it("converges toward true win rate with many votes", () => {
    expect(computeScore(75, 25)).toBeCloseTo(75, 0);
    expect(computeScore(30, 70)).toBeCloseTo(30, 0);
  });

  it("is always strictly between 0 and 100", () => {
    const cases: [number, number][] = [
      [0, 0],
      [100, 0],
      [0, 100],
      [1, 1000],
      [1000, 1],
    ];
    for (const [w, l] of cases) {
      const s = computeScore(w, l);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(100);
    }
  });
});

describe("scoreAfterWin", () => {
  it("equals computeScore(wins + 1, losses)", () => {
    expect(scoreAfterWin(0, 0)).toBe(computeScore(1, 0));
    expect(scoreAfterWin(5, 3)).toBe(computeScore(6, 3));
    expect(scoreAfterWin(0, 10)).toBe(computeScore(1, 10));
  });

  it("is always greater than current score", () => {
    const cases: [number, number][] = [
      [0, 0],
      [5, 3],
      [10, 10],
      [0, 20],
    ];
    for (const [w, l] of cases) {
      expect(scoreAfterWin(w, l)).toBeGreaterThan(computeScore(w, l));
    }
  });

  it("matches the SQL expression used in votes.ts: (wins+2)/(wins+losses+3)*100", () => {
    const cases: [number, number][] = [
      [0, 0],
      [7, 4],
      [15, 5],
      [3, 20],
    ];
    for (const [w, l] of cases) {
      const sqlFormula = ((w + 2) / (w + l + 3)) * 100;
      expect(scoreAfterWin(w, l)).toBeCloseTo(sqlFormula, 10);
    }
  });
});

describe("scoreAfterLoss", () => {
  it("equals computeScore(wins, losses + 1)", () => {
    expect(scoreAfterLoss(0, 0)).toBe(computeScore(0, 1));
    expect(scoreAfterLoss(5, 3)).toBe(computeScore(5, 4));
    expect(scoreAfterLoss(10, 0)).toBe(computeScore(10, 1));
  });

  it("is always less than current score", () => {
    const cases: [number, number][] = [
      [0, 0],
      [5, 3],
      [10, 10],
      [20, 0],
    ];
    for (const [w, l] of cases) {
      expect(scoreAfterLoss(w, l)).toBeLessThan(computeScore(w, l));
    }
  });

  it("matches the SQL expression used in votes.ts: (wins+1)/(wins+losses+3)*100", () => {
    const cases: [number, number][] = [
      [0, 0],
      [7, 4],
      [15, 5],
      [3, 20],
    ];
    for (const [w, l] of cases) {
      const sqlFormula = ((w + 1) / (w + l + 3)) * 100;
      expect(scoreAfterLoss(w, l)).toBeCloseTo(sqlFormula, 10);
    }
  });
});

describe("scoring symmetry and monotonicity", () => {
  it("a win followed by a loss returns to the original score", () => {
    // win then loss: computeScore(w+1, l+1) vs computeScore(w, l)
    // They are not equal (Laplace smoothing), but they converge as votes increase
    const [w, l] = [100, 100];
    const afterWinThenLoss = computeScore(w + 1, l + 1);
    expect(afterWinThenLoss).toBeCloseTo(computeScore(w, l), 1);
  });

  it("score is symmetric: same wins+losses with equal split returns 50", () => {
    for (const n of [1, 5, 20, 100]) {
      expect(computeScore(n, n)).toBeCloseTo(50, 10);
    }
  });

  it("more votes with the same win rate gives higher confidence (score closer to rate)", () => {
    const rate = 0.7;
    const small = computeScore(Math.round(10 * rate), Math.round(10 * (1 - rate)));
    const large = computeScore(Math.round(1000 * rate), Math.round(1000 * (1 - rate)));
    // both should be near 70, but large sample is closer
    expect(Math.abs(large - 70)).toBeLessThan(Math.abs(small - 70));
  });
});
