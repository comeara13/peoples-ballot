import { z } from "zod";
import { eq, desc, and, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { humanId } from "human-id";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import {
  ballots,
  ballotPairs,
  ideas,
  ideaBanks,
  parties,
  prompts,
  ideaTranslations,
  votes,
  glossaryTerms,
  ideaGlossaryTerms,
} from "../db/schema";
import { buildPairWeights, weightedSample } from "../catchup";
import { checkPartyWindow } from "../partyWindow";
import { resolveBranding } from "../branding";

const selectionEnum = z.enum(["left", "right", "cant_decide"]);

async function fetchBallotById(id: string, prefetched?: typeof ballots.$inferSelect) {
  const ballot = prefetched ?? (await db.select().from(ballots).where(eq(ballots.id, id)).then(([r]) => r));

  if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });

  const pairs = await db
    .select()
    .from(ballotPairs)
    .where(eq(ballotPairs.ballotId, id))
    .orderBy(ballotPairs.position);

  const [joined] = await db
    .select({
      partyStatus: parties.status,
      partyStartAt: parties.startAt,
      partyEndAt: parties.endAt,
      partyTitle: parties.title,
      partySubtitle: parties.subtitle,
      partyHeaderImageUrl: parties.headerImageUrl,
      partyQuestionHeading: parties.questionHeading,
      bankName: ideaBanks.name,
      bankTitle: ideaBanks.title,
      bankSubtitle: ideaBanks.subtitle,
      bankHeaderImageUrl: ideaBanks.headerImageUrl,
      bankPostVoteMessage: ideaBanks.postVoteMessage,
      bankQuestionHeading: ideaBanks.questionHeading,
    })
    .from(parties)
    .innerJoin(ideaBanks, eq(ideaBanks.id, parties.ideaBankId))
    .where(eq(parties.id, ballot.partyId));

  const branding = joined
    ? resolveBranding(
        { name: joined.bankName, title: joined.bankTitle, subtitle: joined.bankSubtitle, headerImageUrl: joined.bankHeaderImageUrl, questionHeading: joined.bankQuestionHeading },
        { title: joined.partyTitle, subtitle: joined.partySubtitle, headerImageUrl: joined.partyHeaderImageUrl, questionHeading: joined.partyQuestionHeading },
      )
    : { title: "", subtitle: null as string | null, headerImageUrl: null as string | null, questionHeading: null as string | null };

  const postVoteMessage = joined?.bankPostVoteMessage ?? null;

  const party = joined
    ? { status: joined.partyStatus, startAt: joined.partyStartAt, endAt: joined.partyEndAt }
    : null;

  if (!pairs.length) return { ...ballot, party, branding, postVoteMessage, voteCount: 0, pairs: [] };

  const ideaIds = [...new Set(pairs.flatMap((p) => [p.leftIdeaId, p.rightIdeaId]))];

  const translations = await db
    .select({ ideaId: ideaTranslations.ideaId, text: ideaTranslations.text })
    .from(ideaTranslations)
    .where(and(inArray(ideaTranslations.ideaId, ideaIds), eq(ideaTranslations.language, "en")));

  const textById = new Map(translations.map((t) => [t.ideaId, t.text]));

  const glossaryRows = await db
    .select({
      ideaId: ideaGlossaryTerms.ideaId,
      termId: glossaryTerms.id,
      title: glossaryTerms.title,
      body: glossaryTerms.body,
    })
    .from(ideaGlossaryTerms)
    .innerJoin(glossaryTerms, eq(glossaryTerms.id, ideaGlossaryTerms.termId))
    .where(and(inArray(ideaGlossaryTerms.ideaId, ideaIds), isNull(glossaryTerms.archivedAt)));

  const glossaryByIdeaId = new Map<string, { id: string; title: string; body: string }[]>();
  for (const row of glossaryRows) {
    if (!glossaryByIdeaId.has(row.ideaId)) glossaryByIdeaId.set(row.ideaId, []);
    glossaryByIdeaId.get(row.ideaId)!.push({ id: row.termId, title: row.title, body: row.body });
  }

  const votesList = await db
    .select()
    .from(votes)
    .where(inArray(votes.ballotPairId, pairs.map((p) => p.id)));

  const voteByPairId = new Map(votesList.map((v) => [v.ballotPairId, v]));

  return {
    ...ballot,
    party,
    branding,
    postVoteMessage,
    voteCount: votesList.length,
    pairs: pairs.map((pair) => ({
      ...pair,
      leftText: textById.get(pair.leftIdeaId) ?? "(no translation)",
      rightText: textById.get(pair.rightIdeaId) ?? "(no translation)",
      leftGlossaryTerms: glossaryByIdeaId.get(pair.leftIdeaId) ?? [],
      rightGlossaryTerms: glossaryByIdeaId.get(pair.rightIdeaId) ?? [],
      vote: voteByPairId.get(pair.id) ?? null,
    })),
  };
}

// Shared ballot generation logic used by both admin `generate` and public `createForAlwaysOn`.
async function generateBallotForParty(partyId: string, pairCount: number) {
  const [partyRow] = await db.select({ ideaBankId: parties.ideaBankId }).from(parties).where(eq(parties.id, partyId));
  if (!partyRow) throw new TRPCError({ code: "NOT_FOUND" });
  const ideaBankId = partyRow.ideaBankId;

  const activeIdeas = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(and(eq(ideas.ideaBankId, ideaBankId), eq(ideas.isActive, true)));

  if (activeIdeas.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 active ideas to generate a ballot." });
  }

  const existingPrompts = await db
    .select({ id: prompts.id, leftIdeaId: prompts.leftIdeaId, rightIdeaId: prompts.rightIdeaId, votesCount: prompts.votesCount })
    .from(prompts)
    .where(eq(prompts.ideaBankId, ideaBankId));

  const promptById = new Map(existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p]));
  const votesByKey = new Map(existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p.votesCount]));

  const ideaIds = activeIdeas.map((i) => i.id);
  const weighted = buildPairWeights(ideaIds, votesByKey);
  const k = Math.min(pairCount, weighted.length);
  const selected = weightedSample(weighted, k);

  // Pick a unique access code before entering the transaction.
  // Retry loop uses a SELECT pre-check to avoid aborting the transaction on a 23505 collision
  // (a failed INSERT inside a Postgres tx leaves it in an aborted state; 25P02 on every
  // subsequent statement until rollback). TOCTOU window exists: two concurrent generates
  // could pass the SELECT check and race to INSERT the same code. If that happens the second
  // INSERT will throw 23505 inside the transaction and surface as a 500 — acceptable given
  // human-id@4's vocabulary produces billions of combinations and ballot creation rate is low.
  let accessCode: string | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = humanId({ separator: "-", capitalize: false });
    const [existing] = await db.select({ id: ballots.id }).from(ballots).where(eq(ballots.accessCode, candidate)).limit(1);
    if (!existing) { accessCode = candidate; break; }
  }
  if (!accessCode) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate unique access code" });

  return db.transaction(async (tx) => {
    const [ballot] = await tx
      .insert(ballots)
      .values({ partyId, status: "pending", accessCode })
      .returning();
    if (!ballot) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    for (let i = 0; i < selected.length; i++) {
      const pair = selected[i];
      const existing = promptById.get(`${pair.left}|${pair.right}`);

      let promptId: string;
      if (existing) {
        promptId = existing.id;
      } else {
        const [p] = await tx
          .insert(prompts)
          .values({ ideaBankId, leftIdeaId: pair.left, rightIdeaId: pair.right })
          .onConflictDoUpdate({
            target: [prompts.ideaBankId, prompts.leftIdeaId, prompts.rightIdeaId],
            set: { votesCount: prompts.votesCount }, // no-op to get the row back
          })
          .returning();
        promptId = p.id;
      }

      const flip = Math.random() < 0.5;
      await tx.insert(ballotPairs).values({
        ballotId: ballot.id,
        promptId,
        position: i + 1,
        leftIdeaId: flip ? pair.right : pair.left,
        rightIdeaId: flip ? pair.left : pair.right,
      });
    }

    return ballot;
  });
}

export const ballotsRouter = router({
  generate: adminProcedure
    .input(
      z.object({
        partyId: z.string().uuid(),
        pairCount: z.number().int().min(1).max(50).default(10),
      }),
    )
    .mutation(async ({ input }) => {
      const [party] = await db.select().from(parties).where(eq(parties.id, input.partyId));
      if (!party) throw new TRPCError({ code: "NOT_FOUND" });
      if (party.status === "closed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot generate ballots for a closed party." });
      return generateBallotForParty(input.partyId, input.pairCount);
    }),

  createForAlwaysOn: publicProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [party] = await db.select().from(parties).where(eq(parties.id, input.partyId));
      if (!party) throw new TRPCError({ code: "NOT_FOUND" });
      if (party.mode !== "always_on")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Party is not open for walk-in voting." });
      if (party.status === "closed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "This voting session is closed." });
      return generateBallotForParty(input.partyId, party.defaultPairCount ?? 10);
    }),

  listByParty: adminProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: ballots.id,
          status: ballots.status,
          accessCode: ballots.accessCode,
          createdAt: ballots.createdAt,
          submittedAt: ballots.submittedAt,
          pairCount: sql<number>`COUNT(DISTINCT ${ballotPairs.id})::int`,
          voteCount: sql<number>`COUNT(DISTINCT ${votes.id})::int`,
        })
        .from(ballots)
        .leftJoin(ballotPairs, eq(ballotPairs.ballotId, ballots.id))
        .leftJoin(votes, eq(votes.ballotPairId, ballotPairs.id))
        .where(eq(ballots.partyId, input.partyId))
        .groupBy(ballots.id)
        .orderBy(desc(ballots.createdAt));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => fetchBallotById(input.id)),

  getByCode: publicProcedure
    .input(z.object({ code: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/i) }))
    .query(async ({ input }) => {
      const [ballot] = await db.select().from(ballots).where(eq(ballots.accessCode, input.code.toLowerCase()));
      if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });
      return fetchBallotById(ballot.id, ballot);
    }),

  submit: publicProcedure
    .input(
      z.object({
        ballotId: z.string().uuid(),
        votes: z.array(
          z.object({
            ballotPairId: z.string().uuid(),
            selection: selectionEnum,
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const [ballot] = await db.select().from(ballots).where(eq(ballots.id, input.ballotId));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });
      if (ballot.status === "submitted")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ballot already submitted." });

      const [submitParty] = await db.select().from(parties).where(eq(parties.id, ballot.partyId));
      if (submitParty) {
        const result = checkPartyWindow(submitParty);
        if (!result.ok) throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }

      const pairs = await db
        .select()
        .from(ballotPairs)
        .where(eq(ballotPairs.ballotId, input.ballotId));

      const pairIds = new Set(pairs.map((p) => p.id));
      const submittedIds = new Set(input.votes.map((v) => v.ballotPairId));

      for (const id of pairIds) {
        if (!submittedIds.has(id))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All pairs must have a vote before submitting.",
          });
      }

      const pairById = new Map(pairs.map((p) => [p.id, p]));

      await db.transaction(async (tx) => {
        for (const v of input.votes) {
          const pair = pairById.get(v.ballotPairId)!;

          await tx.insert(votes).values({
            ballotPairId: v.ballotPairId,
            selection: v.selection,
          });

          if (v.selection === "cant_decide") continue;

          await tx
            .update(prompts)
            .set({ votesCount: sql`${prompts.votesCount} + 1` })
            .where(eq(prompts.id, pair.promptId));
        }

        await tx
          .update(ballots)
          .set({ status: "submitted", submittedAt: new Date() })
          .where(eq(ballots.id, input.ballotId));
      });

      return { success: true };
    }),
});
