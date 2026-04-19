import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import {
  ballots,
  ballotPairs,
  ideas,
  prompts,
  ideaTranslations,
  votes,
} from "../db/schema";
import { buildPairWeights, weightedSample } from "../catchup";

const selectionEnum = z.enum(["left", "right", "cant_decide"]);

export const ballotsRouter = router({
  generate: publicProcedure
    .input(
      z.object({
        ideaBankId: z.string().uuid(),
        pairCount: z.number().int().min(1).max(50).default(10),
      }),
    )
    .mutation(async ({ input }) => {
      // 1. Active ideas
      const activeIdeas = await db
        .select({ id: ideas.id })
        .from(ideas)
        .where(
          and(eq(ideas.ideaBankId, input.ideaBankId), eq(ideas.isActive, true)),
        );

      if (activeIdeas.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 2 active ideas to generate a ballot.",
        });
      }

      // 2. Existing prompt vote history for catchup weights
      const existingPrompts = await db
        .select({
          id: prompts.id,
          leftIdeaId: prompts.leftIdeaId,
          rightIdeaId: prompts.rightIdeaId,
          votesCount: prompts.votesCount,
        })
        .from(prompts)
        .where(eq(prompts.ideaBankId, input.ideaBankId));

      const promptById = new Map(existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p]));
      const votesByKey = new Map(existingPrompts.map((p) => [`${p.leftIdeaId}|${p.rightIdeaId}`, p.votesCount]));

      // 3. Catchup sampling
      const ideaIds = activeIdeas.map((i) => i.id);
      const weighted = buildPairWeights(ideaIds, votesByKey);
      const k = Math.min(input.pairCount, weighted.length);
      const selected = weightedSample(weighted, k);

      // 4. Persist ballot + pairs in a transaction
      return db.transaction(async (tx) => {
        const [ballot] = await tx
          .insert(ballots)
          .values({ ideaBankId: input.ideaBankId, status: "pending" })
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
                ideaBankId: input.ideaBankId,
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

  listByBank: publicProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
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
        .where(eq(ballots.ideaBankId, input.ideaBankId))
        .groupBy(ballots.id)
        .orderBy(desc(ballots.createdAt));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [ballot] = await db
        .select()
        .from(ballots)
        .where(eq(ballots.id, input.id));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });

      const pairs = await db
        .select()
        .from(ballotPairs)
        .where(eq(ballotPairs.ballotId, input.id))
        .orderBy(ballotPairs.position);

      if (!pairs.length) return { ...ballot, voteCount: 0, pairs: [] };

      const ideaIds = [
        ...new Set(pairs.flatMap((p) => [p.leftIdeaId, p.rightIdeaId])),
      ];

      const translations = await db
        .select({ ideaId: ideaTranslations.ideaId, text: ideaTranslations.text })
        .from(ideaTranslations)
        .where(
          and(
            inArray(ideaTranslations.ideaId, ideaIds),
            eq(ideaTranslations.language, "en"),
          ),
        );

      const textById = new Map(translations.map((t) => [t.ideaId, t.text]));

      const votesList = await db
        .select()
        .from(votes)
        .where(inArray(votes.ballotPairId, pairs.map((p) => p.id)));

      const voteByPairId = new Map(votesList.map((v) => [v.ballotPairId, v]));

      return {
        ...ballot,
        voteCount: votesList.length,
        pairs: pairs.map((pair) => ({
          ...pair,
          leftText: textById.get(pair.leftIdeaId) ?? "(no translation)",
          rightText: textById.get(pair.rightIdeaId) ?? "(no translation)",
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
      const [ballot] = await db
        .select()
        .from(ballots)
        .where(eq(ballots.id, input.ballotId));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND" });
      if (ballot.status === "submitted")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ballot already submitted." });

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

          const winnerId = v.selection === "left" ? pair.leftIdeaId : pair.rightIdeaId;
          const loserId = v.selection === "left" ? pair.rightIdeaId : pair.leftIdeaId;

          await tx
            .update(prompts)
            .set({ votesCount: sql`${prompts.votesCount} + 1` })
            .where(eq(prompts.id, pair.promptId));

          await tx
            .update(ideas)
            .set({
              wins: sql`${ideas.wins} + 1`,
              score: sql`(${ideas.wins} + 2.0) / (${ideas.wins} + ${ideas.losses} + 3.0) * 100`,
            })
            .where(eq(ideas.id, winnerId));

          await tx
            .update(ideas)
            .set({
              losses: sql`${ideas.losses} + 1`,
              score: sql`(${ideas.wins} + 1.0) / (${ideas.wins} + ${ideas.losses} + 3.0) * 100`,
            })
            .where(eq(ideas.id, loserId));
        }

        await tx
          .update(ballots)
          .set({ status: "submitted", submittedAt: new Date() })
          .where(eq(ballots.id, input.ballotId));
      });

      return { success: true };
    }),
});
