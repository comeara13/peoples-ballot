import { describe, it, expect } from "bun:test";
import { checkPartyWindow } from "./partyWindow";

const PAST = new Date("2020-01-01T00:00:00Z");
const FUTURE = new Date("2099-01-01T00:00:00Z");
const NOW = new Date("2025-06-01T12:00:00Z");

describe("checkPartyWindow", () => {
  // ─── Closed party ────────────────────────────────────────────────────────────

  describe("closed party", () => {
    it("rejects when no time window is set", () => {
      const r = checkPartyWindow({ status: "closed", startAt: PAST, endAt: null }, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("closed");
    });

    it("rejects even when current time is inside a valid window", () => {
      const r = checkPartyWindow(
        { status: "closed", startAt: PAST, endAt: FUTURE },
        NOW,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("closed");
    });
  });

  // ─── No time window (endAt null, startAt in past) ────────────────────────────

  describe("no time window", () => {
    it("allows submission for an active party with no end time", () => {
      const r = checkPartyWindow({ status: "active", startAt: PAST, endAt: null }, NOW);
      expect(r.ok).toBe(true);
    });
  });

  // ─── One-sided: startAt only (open-ended) ────────────────────────────────────

  describe("startAt only (open end)", () => {
    it("rejects before startAt", () => {
      const r = checkPartyWindow({ status: "active", startAt: FUTURE, endAt: null }, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("not_started");
    });

    it("allows exactly at startAt", () => {
      const r = checkPartyWindow({ status: "active", startAt: NOW, endAt: null }, NOW);
      expect(r.ok).toBe(true);
    });

    it("allows after startAt with no end constraint", () => {
      const r = checkPartyWindow({ status: "active", startAt: PAST, endAt: null }, NOW);
      expect(r.ok).toBe(true);
    });
  });

  // ─── One-sided: endAt only (open start, startAt defaulted to past) ───────────

  describe("endAt only (open start via past startAt)", () => {
    it("allows when before endAt", () => {
      const r = checkPartyWindow({ status: "active", startAt: PAST, endAt: FUTURE }, NOW);
      expect(r.ok).toBe(true);
    });

    it("rejects when after endAt", () => {
      const r = checkPartyWindow({ status: "active", startAt: PAST, endAt: PAST }, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("ended");
    });
  });

  // ─── Full window ─────────────────────────────────────────────────────────────

  describe("full window (startAt and endAt both set)", () => {
    const startAt = new Date("2025-06-01T09:00:00Z");
    const endAt = new Date("2025-06-01T17:00:00Z");

    it("rejects before window opens", () => {
      const r = checkPartyWindow({ status: "active", startAt, endAt }, new Date("2025-06-01T08:59:59Z"));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("not_started");
    });

    it("allows at the start of the window", () => {
      const r = checkPartyWindow({ status: "active", startAt, endAt }, startAt);
      expect(r.ok).toBe(true);
    });

    it("allows in the middle of the window", () => {
      const r = checkPartyWindow({ status: "active", startAt, endAt }, new Date("2025-06-01T12:00:00Z"));
      expect(r.ok).toBe(true);
    });

    it("rejects after window closes", () => {
      const r = checkPartyWindow({ status: "active", startAt, endAt }, new Date("2025-06-01T17:00:01Z"));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("ended");
    });
  });

  // ─── Error message content ───────────────────────────────────────────────────

  describe("error messages", () => {
    it("includes a message for every failure reason", () => {
      const closed = checkPartyWindow({ status: "closed", startAt: PAST, endAt: null }, NOW);
      const notStarted = checkPartyWindow({ status: "active", startAt: FUTURE, endAt: null }, NOW);
      const ended = checkPartyWindow({ status: "active", startAt: PAST, endAt: PAST }, NOW);
      for (const r of [closed, notStarted, ended]) {
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.message.length).toBeGreaterThan(0);
      }
    });
  });
});
