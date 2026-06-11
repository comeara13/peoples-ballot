import { describe, it, expect } from "bun:test";
import { resolveBranding } from "./branding";

const bank = (overrides: Partial<Parameters<typeof resolveBranding>[0]> = {}) => ({
  name: "Default Bank",
  title: null,
  subtitle: null,
  headerImageUrl: null,
  questionHeading: null,
  ...overrides,
});

const party = (overrides: Partial<Parameters<typeof resolveBranding>[1]> = {}) => ({
  title: null,
  subtitle: null,
  headerImageUrl: null,
  questionHeading: null,
  ...overrides,
});

describe("resolveBranding", () => {
  it("falls back to bank.name when bank.title is null and party is null", () => {
    expect(resolveBranding(bank(), null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("uses bank values when party is null", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    expect(resolveBranding(b, null)).toEqual({
      title: "Bank Title",
      subtitle: "Bank Sub",
      headerImageUrl: "https://img.example.com/a.jpg",
      questionHeading: null,
    });
  });

  it("party overrides all three fields", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    const p = party({ title: "Party Title", subtitle: "Party Sub", headerImageUrl: "https://img.example.com/b.jpg" });
    expect(resolveBranding(b, p)).toEqual({
      title: "Party Title",
      subtitle: "Party Sub",
      headerImageUrl: "https://img.example.com/b.jpg",
      questionHeading: null,
    });
  });

  it("party overrides title only; subtitle and image fall back to bank", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    const p = party({ title: "Party Title" });
    expect(resolveBranding(b, p)).toEqual({
      title: "Party Title",
      subtitle: "Bank Sub",
      headerImageUrl: "https://img.example.com/a.jpg",
      questionHeading: null,
    });
  });

  it("falls back to bank.name when both bank.title and party.title are null", () => {
    const p = party({ subtitle: "Party Sub" });
    expect(resolveBranding(bank(), p)).toEqual({
      title: "Default Bank",
      subtitle: "Party Sub",
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("party with all nulls inherits everything from bank including name fallback", () => {
    const b = bank({ subtitle: "Bank Sub" });
    expect(resolveBranding(b, party())).toEqual({
      title: "Default Bank",
      subtitle: "Bank Sub",
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("empty string title is treated as absent and falls back to bank.name", () => {
    expect(resolveBranding(bank({ title: "" }), null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("whitespace-only title is treated as absent and falls back to bank.name", () => {
    expect(resolveBranding(bank({ title: "   " }), null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("empty string party title falls back to bank title", () => {
    const b = bank({ title: "Bank Title" });
    expect(resolveBranding(b, party({ title: "" }))).toEqual({
      title: "Bank Title",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("uses bank questionHeading when party has none", () => {
    const b = bank({ questionHeading: "Which idea is best?" });
    expect(resolveBranding(b, null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: "Which idea is best?",
    });
  });

  it("party questionHeading overrides bank questionHeading", () => {
    const b = bank({ questionHeading: "Bank question?" });
    const p = party({ questionHeading: "Party question?" });
    expect(resolveBranding(b, p)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: "Party question?",
    });
  });

  it("party with null questionHeading falls back to bank questionHeading", () => {
    const b = bank({ questionHeading: "Bank question?" });
    expect(resolveBranding(b, party())).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: "Bank question?",
    });
  });

  it("whitespace-only questionHeading is treated as absent", () => {
    const b = bank({ questionHeading: "   " });
    expect(resolveBranding(b, null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
      questionHeading: null,
    });
  });

  it("questionHeading supports markdown syntax as a plain string", () => {
    const b = bank({ questionHeading: "Which idea would **best** help?" });
    expect(resolveBranding(b, null).questionHeading).toBe("Which idea would **best** help?");
  });
});
