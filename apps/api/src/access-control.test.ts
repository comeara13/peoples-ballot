import { describe, it, expect } from "bun:test";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createCallerFactory } from "./trpc";

// Access-control compliance test.
//
// Every procedure in the app is listed here with its intended gate ("public" or "admin").
// Tests call each procedure as a non-admin and assert:
//   - admin procedures  → throw FORBIDDEN (before hitting the DB)
//   - public procedures → throw anything EXCEPT FORBIDDEN (typically NOT_FOUND for fake UUIDs)
//
// Adding a new procedure without updating this file will not fail CI on its own,
// but a mis-gated procedure (e.g. public endpoint accidentally on adminProcedure)
// will be caught immediately.

const NIL = "00000000-0000-0000-0000-000000000000";
const ISO = new Date().toISOString();

const createCaller = createCallerFactory(appRouter);
const anon = createCaller({ clerkUserId: null, isAdmin: false });

async function expectForbidden(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("Expected FORBIDDEN but procedure resolved");
  } catch (e) {
    if (!(e instanceof TRPCError)) throw e; // surface unexpected errors with their real message
    expect(e.code).toBe("FORBIDDEN");
  }
}

async function expectNotForbidden(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof TRPCError) {
      expect(e.code).not.toBe("FORBIDDEN");
    }
    // Non-TRPCError (e.g. DB unreachable) is re-thrown as-is by tRPC and won't be FORBIDDEN.
    // This means a raw Error from a public procedure bug is invisible here — intentional,
    // since this file only tests access control, not procedure correctness.
  }
}

// ── ballots ──────────────────────────────────────────────────────────────────

describe("ballots", () => {
  it("generate          → admin",  () => expectForbidden(anon.ballots.generate({ partyId: NIL })));
  it("listByParty       → admin",  () => expectForbidden(anon.ballots.listByParty({ partyId: NIL })));
  it("getById           → public", () => expectNotForbidden(anon.ballots.getById({ id: NIL })));
  it("getByCode         → public", () => expectNotForbidden(anon.ballots.getByCode({ code: "brave-golden-river" })));
  it("submit            → public", () => expectNotForbidden(anon.ballots.submit({ ballotId: NIL, votes: [], raceEthnicityCategories: ["prefer_not_to_say"], birthYear: null, gender: "prefer_not_to_say" })));
  it("createForAlwaysOn → public", () => expectNotForbidden(anon.ballots.createForAlwaysOn({ partyId: NIL })));
  it("createForAlwaysOn with non-existent party → NOT_FOUND", async () => {
    await expect(
      anon.ballots.createForAlwaysOn({ partyId: NIL }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── votes ────────────────────────────────────────────────────────────────────

describe("votes", () => {
  it("create → public", () =>
    expectNotForbidden(anon.votes.create({ ballotPairId: NIL, selection: "left" })));
});

// ── voters ───────────────────────────────────────────────────────────────────

describe("voters", () => {
  it("register → public", () =>
    expectNotForbidden(
      anon.voters.register({
        ballotId: NIL,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        addressStreet: "123 Main St",
        addressCity: "Anytown",
        addressState: "CA",
        addressZip: "90210",
        affiliationIds: [],
        consentedAt: ISO,
        assessmentResponses: [],
      }),
    ));
  it("getById  → admin", () => expectForbidden(anon.voters.getById({ id: NIL })));
});

// ── ideaBanks ────────────────────────────────────────────────────────────────
// TODO: setIdeaActive → admin (listed in docs/auth-gates.md but not yet implemented)

describe("ideaBanks", () => {
  it("list             → public", () => expectNotForbidden(anon.ideaBanks.list()));
  it("create           → admin",  () => expectForbidden(anon.ideaBanks.create({ name: "x" })));
  it("update           → admin",  () => expectForbidden(anon.ideaBanks.update({ id: NIL })));
  it("getById          → admin",  () => expectForbidden(anon.ideaBanks.getById({ id: NIL })));
  it("createIdea        → admin",  () => expectForbidden(anon.ideaBanks.createIdea({ ideaBankId: NIL })));
  it("setIdeaTags       → admin",  () => expectForbidden(anon.ideaBanks.setIdeaTags({ ideaId: NIL, tagIds: [] })));
  it("upsertTranslation → admin",  () => expectForbidden(anon.ideaBanks.upsertTranslation({ ideaId: NIL, language: "en", text: "x" })));
});

// ── parties ──────────────────────────────────────────────────────────────────

describe("parties", () => {
  it("create     → admin", () => expectForbidden(anon.parties.create({ ideaBankId: NIL, name: "x" })));
  it("update     → admin", () => expectForbidden(anon.parties.update({ id: NIL })));
  it("listByBank → admin", () => expectForbidden(anon.parties.listByBank({ ideaBankId: NIL })));
  it("close      → admin", () => expectForbidden(anon.parties.close({ id: NIL })));
});

// ── affiliations ─────────────────────────────────────────────────────────────

describe("affiliations", () => {
  it("listForBallot → public", () => expectNotForbidden(anon.affiliations.listForBallot({ ballotId: NIL })));
  it("listForBank   → admin",  () => expectForbidden(anon.affiliations.listForBank({ ideaBankId: NIL })));
  it("create        → admin",  () => expectForbidden(anon.affiliations.create({ ideaBankId: NIL, name: "x" })));
  it("delete        → admin",  () => expectForbidden(anon.affiliations.delete({ id: NIL })));
});

// ── assessment ───────────────────────────────────────────────────────────────

describe("assessment", () => {
  it("listQuestionsForBallot  → public", () => expectNotForbidden(anon.assessment.listQuestionsForBallot({ ballotId: NIL, stage: "pre" })));
  it("listQuestionsForBank    → admin",  () => expectForbidden(anon.assessment.listQuestionsForBank({ ideaBankId: NIL, stage: "pre" })));
  it("createQuestion          → admin",  () => expectForbidden(anon.assessment.createQuestion({ ideaBankId: NIL, text: "x", type: "likert", stage: "pre" })));
  it("deleteQuestion          → admin",  () => expectForbidden(anon.assessment.deleteQuestion({ id: NIL })));
  it("resultsForBank          → admin",  () => expectForbidden(anon.assessment.resultsForBank({ ideaBankId: NIL, stage: "pre" })));
});

// ── tags ─────────────────────────────────────────────────────────────────────

describe("tags", () => {
  it("list      → public", () => expectNotForbidden(anon.tags.list()));
  it("create    → admin",  () => expectForbidden(anon.tags.create({ name: "x", type: "issue_category" })));
  it("archive   → admin",  () => expectForbidden(anon.tags.archive({ id: NIL })));
  it("unarchive → admin",  () => expectForbidden(anon.tags.unarchive({ id: NIL })));
});

// ── suggestedIdeas ───────────────────────────────────────────────────────────

describe("suggestedIdeas", () => {
  it("submit      → public", () => expectNotForbidden(anon.suggestedIdeas.submit({ ballotId: NIL, text: "x" })));
  it("listByParty → admin",  () => expectForbidden(anon.suggestedIdeas.listByParty({ partyId: NIL })));
  it("listByBank  → admin",  () => expectForbidden(anon.suggestedIdeas.listByBank({ ideaBankId: NIL })));
});

// ── glossary ─────────────────────────────────────────────────────────────────

describe("glossary", () => {
  it("list           → public", () => expectNotForbidden(anon.glossary.list()));
  it("create         → admin",  () => expectForbidden(anon.glossary.create({ title: "x", body: "x" })));
  it("update         → admin",  () => expectForbidden(anon.glossary.update({ id: NIL })));
  it("archive        → admin",  () => expectForbidden(anon.glossary.archive({ id: NIL })));
  it("unarchive      → admin",  () => expectForbidden(anon.glossary.unarchive({ id: NIL })));
  it("setIdeaTerms   → admin",  () => expectForbidden(anon.glossary.setIdeaTerms({ ideaId: NIL, termIds: [] })));
  it("getIdeaTermIds → admin",  () => expectForbidden(anon.glossary.getIdeaTermIds({ ideaIds: [NIL] })));
});

// ── testimonials ─────────────────────────────────────────────────────────────

describe("testimonials", () => {
  it("submit        → public", () => expectNotForbidden(anon.testimonials.submit({ ballotId: NIL, text: "x" })));
  it("listForBallot → admin",  () => expectForbidden(anon.testimonials.listForBallot({ ballotId: NIL })));
  it("listForParty  → admin",  () => expectForbidden(anon.testimonials.listForParty({ partyId: NIL })));
  it("listForBank   → admin",  () => expectForbidden(anon.testimonials.listForBank({ ideaBankId: NIL })));
});

// ── suggestionLinks ──────────────────────────────────────────────────────────

describe("suggestionLinks", () => {
  it("link                 → admin", () => expectForbidden(anon.suggestionLinks.link({ suggestionId: NIL, ideaId: NIL })));
  it("unlink               → admin", () => expectForbidden(anon.suggestionLinks.unlink({ suggestionId: NIL, ideaId: NIL })));
  it("listForIdea          → admin", () => expectForbidden(anon.suggestionLinks.listForIdea({ ideaId: NIL })));
  it("listForSuggestion    → admin", () => expectForbidden(anon.suggestionLinks.listForSuggestion({ suggestionId: NIL })));
  it("candidateSuggestions → admin", () => expectForbidden(anon.suggestionLinks.candidateSuggestions({ ideaId: NIL })));
  it("candidateIdeas       → admin", () => expectForbidden(anon.suggestionLinks.candidateIdeas({ suggestionId: NIL })));
});
