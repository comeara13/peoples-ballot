import { describe, it, expect } from "bun:test";
import { resolveBranding } from "./branding";

const bank = (overrides: Partial<Parameters<typeof resolveBranding>[0]> = {}) => ({
  name: "Default Bank",
  title: null,
  subtitle: null,
  headerImageUrl: null,
  ...overrides,
});

const party = (overrides: Partial<Parameters<typeof resolveBranding>[1]> = {}) => ({
  title: null,
  subtitle: null,
  headerImageUrl: null,
  ...overrides,
});

describe("resolveBranding", () => {
  it("falls back to bank.name when bank.title is null and party is null", () => {
    expect(resolveBranding(bank(), null)).toEqual({
      title: "Default Bank",
      subtitle: null,
      headerImageUrl: null,
    });
  });

  it("uses bank values when party is null", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    expect(resolveBranding(b, null)).toEqual({
      title: "Bank Title",
      subtitle: "Bank Sub",
      headerImageUrl: "https://img.example.com/a.jpg",
    });
  });

  it("party overrides all three fields", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    const p = party({ title: "Party Title", subtitle: "Party Sub", headerImageUrl: "https://img.example.com/b.jpg" });
    expect(resolveBranding(b, p)).toEqual({
      title: "Party Title",
      subtitle: "Party Sub",
      headerImageUrl: "https://img.example.com/b.jpg",
    });
  });

  it("party overrides title only; subtitle and image fall back to bank", () => {
    const b = bank({ title: "Bank Title", subtitle: "Bank Sub", headerImageUrl: "https://img.example.com/a.jpg" });
    const p = party({ title: "Party Title" });
    expect(resolveBranding(b, p)).toEqual({
      title: "Party Title",
      subtitle: "Bank Sub",
      headerImageUrl: "https://img.example.com/a.jpg",
    });
  });

  it("falls back to bank.name when both bank.title and party.title are null", () => {
    const p = party({ subtitle: "Party Sub" });
    expect(resolveBranding(bank(), p)).toEqual({
      title: "Default Bank",
      subtitle: "Party Sub",
      headerImageUrl: null,
    });
  });

  it("party with all nulls inherits everything from bank including name fallback", () => {
    const b = bank({ subtitle: "Bank Sub" });
    expect(resolveBranding(b, party())).toEqual({
      title: "Default Bank",
      subtitle: "Bank Sub",
      headerImageUrl: null,
    });
  });
});
