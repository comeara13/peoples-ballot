import { z } from "zod";
import { eq, desc, and, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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

export const ballotsRouter = router({
  generate: adminProcedure
    .input(
      z.object({
        partyId: z.string().uuid(),
        pairCount: z.number().int().min(1).max(50).default(10),
      }),
    )
    .mutation(async ({ input }) => {
      // 1. Look up party → derive ideaBankId
      const [party] = await db.select().from(parties).where(eq(parties.id, input.partyId));

      if (!party) throw new TRPCError({ code: "NOT_FOUND" });
      if (party.status === "closed")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate ballots for a closed party.",
        });

      const ideaBankId = party.ideaBankId;

      // 2. Active ideas
      const activeIdeas = await db
        .select({ id: ideas.id })
        .from(ideas)
        .where(and(eq(ideas.ideaBankId, ideaBankId), eq(ideas.isActive, true)));

      if (activeIdeas.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 2 active ideas to generate a ballot.",
        });
      }

      // 3. Existing prompt vote history for catchup weights (bank-wide)
      const existingPrompts = await db
        .select({
          id: prompts.id,
          leftIdeaId: prompts.leftIdeaId,
          rightIdeaId: prompts.rightIdeaId,
          votesCount: prompts.votesCount,
        })
        .from(prompts)
        .where(eq(prompts.ideaBankId, ideaBankId));

      const promptById = new Map(
        existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p]),
      );
      const votesByKey = new Map(
        existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p.votesCount]),
      );

      // 4. Catchup sampling
      const ideaIds = activeIdeas.map((i) => i.id);
      const weighted = buildPairWeights(ideaIds, votesByKey);
      const k = Math.min(input.pairCount, weighted.length);
      const selected = weightedSample(weighted, k);

      // 5. Persist ballot + pairs in a transaction
      return db.transaction(async (tx) => {
        const [ballot] = await tx
          .insert(ballots)
          .values({ partyId: input.partyId, status: "pending" })
          .returning();

        for (let i = 0; i < selected.length; i++) {
          const pair = selected[i];
          const existing = promptById.get(`${pair.left}|${pair.right}`);

          // Upsert prompt — atomic get-or-create
          let promptId: string;
          if (existing) {
            promptId = existing.id;
          } else {
            const [p] = await tx
              .insert(prompts)
              .values({
                ideaBankId,
                leftIdeaId: pair.left,
                rightIdeaId: pair.right,
              })
              .onConflictDoUpdate({
                target: [prompts.ideaBankId, prompts.leftIdeaId, prompts.rightIdeaId],
                set: { votesCount: prompts.votesCount }, // no-op to get the row back
              })
              .returning();
            promptId = p.id;
          }

          // Random left/right flip for presentation variety
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
    }),

  listByParty: adminProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: ballots.id,
          status: ballots.status,
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

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [ballot] = await db.select().from(ballots).where(eq(ballots.id, input.id));

    if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });

    const pairs = await db
      .select()
      .from(ballotPairs)
      .where(eq(ballotPairs.ballotId, input.id))
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
      .where(
        inArray(
          votes.ballotPairId,
          pairs.map((p) => p.id),
        ),
      );

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
