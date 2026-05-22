import { z } from "zod";
import { eq, count, inArray, or, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { ideaBanks, ideas, ideaTranslations, ballotPairs, votes, ideaTags, tags } from "../db/schema";
import { computeScore } from "../scoring";

export const ideaBanksRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        title: z.string().max(200).optional(),
        subtitle: z.string().max(500).optional(),
        headerImageUrl: z.string().url().startsWith("https://").optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [bank] = await db
        .insert(ideaBanks)
        .values({
          name: input.name,
          title: input.title ?? null,
          subtitle: input.subtitle ?? null,
          headerImageUrl: input.headerImageUrl ?? null,
        })
        .returning();
      return bank;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        title: z.string().max(200).nullable().optional(),
        subtitle: z.string().max(500).nullable().optional(),
        headerImageUrl: z.string().url().startsWith("https://").nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [existing] = await db.select().from(ideaBanks).where(eq(ideaBanks.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(ideaBanks)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
          ...(input.headerImageUrl !== undefined && { headerImageUrl: input.headerImageUrl }),
        })
        .where(eq(ideaBanks.id, input.id))
        .returning();

      return updated;
    }),

  list: publicProcedure.query(async () => {
    return db
      .select({
        id: ideaBanks.id,
        name: ideaBanks.name,
        title: ideaBanks.title,
        subtitle: ideaBanks.subtitle,
        headerImageUrl: ideaBanks.headerImageUrl,
        createdAt: ideaBanks.createdAt,
        ideaCount: count(ideas.id),
      })
      .from(ideaBanks)
      .leftJoin(ideas, eq(ideas.ideaBankId, ideaBanks.id))
      .groupBy(ideaBanks.id)
      .orderBy(ideaBanks.createdAt);
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [bank] = await db.select().from(ideaBanks).where(eq(ideaBanks.id, input.id));

    if (!bank) throw new TRPCError({ code: "NOT_FOUND" });

    const ideasList = await db.select().from(ideas).where(eq(ideas.ideaBankId, input.id));

    const ideaIds = ideasList.map((i) => i.id);

    const translations =
      ideaIds.length > 0
        ? await db.select().from(ideaTranslations).where(inArray(ideaTranslations.ideaId, ideaIds))
        : [];

    const ideaTagRows =
      ideaIds.length > 0
        ? await db
            .select({ ideaId: ideaTags.ideaId, tag: tags })
            .from(ideaTags)
            .innerJoin(tags, eq(tags.id, ideaTags.tagId))
            .where(inArray(ideaTags.ideaId, ideaIds))
        : [];

    // Fetch ballot_pairs involving any of this bank's ideas
    const pairsForIdeas =
      ideaIds.length > 0
        ? await db
            .select({
              id: ballotPairs.id,
              leftIdeaId: ballotPairs.leftIdeaId,
              rightIdeaId: ballotPairs.rightIdeaId,
            })
            .from(ballotPairs)
            .where(
              or(
                inArray(ballotPairs.leftIdeaId, ideaIds),
                inArray(ballotPairs.rightIdeaId, ideaIds),
              ),
            )
        : [];

    // Non-cant_decide votes for those pairs
    const pairIds = pairsForIdeas.map((p) => p.id);
    const votesForPairs =
      pairIds.length > 0
        ? await db
            .select({ ballotPairId: votes.ballotPairId, selection: votes.selection })
            .from(votes)
            .where(and(inArray(votes.ballotPairId, pairIds), ne(votes.selection, "cant_decide")))
        : [];

    // Aggregate wins/losses per idea in application code
    const pairById = new Map(pairsForIdeas.map((p) => [p.id, p]));
    const winsMap = new Map<string, number>();
    const lossesMap = new Map<string, number>();

    for (const vote of votesForPairs) {
      const pair = pairById.get(vote.ballotPairId)!;
      const winnerId = vote.selection === "left" ? pair.leftIdeaId : pair.rightIdeaId;
      const loserId = vote.selection === "left" ? pair.rightIdeaId : pair.leftIdeaId;
      winsMap.set(winnerId, (winsMap.get(winnerId) ?? 0) + 1);
      lossesMap.set(loserId, (lossesMap.get(loserId) ?? 0) + 1);
    }

    return {
      ...bank,
      ideas: ideasList
        .map((idea) => {
          const w = winsMap.get(idea.id) ?? 0;
          const l = lossesMap.get(idea.id) ?? 0;
          return {
            ...idea,
            wins: w,
            losses: l,
            score: computeScore(w, l),
            voteCount: w + l,
            translations: translations.filter((t) => t.ideaId === idea.id),
            tags: ideaTagRows.filter((r) => r.ideaId === idea.id).map((r) => r.tag),
          };
        })
        .sort((a, b) => b.score - a.score || b.wins - a.wins),
    };
  }),

  createIdea: publicProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [idea] = await db.insert(ideas).values(input).returning();
      return idea;
    }),

  setIdeaTags: publicProcedure
    .input(z.object({ ideaId: z.string().uuid(), tagIds: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(ideaTags).where(eq(ideaTags.ideaId, input.ideaId));
        if (input.tagIds.length > 0) {
          await tx
            .insert(ideaTags)
            .values(input.tagIds.map((tagId) => ({ ideaId: input.ideaId, tagId })));
        }
      });
    }),

  upsertTranslation: publicProcedure
    .input(
      z.object({
        ideaId: z.string().uuid(),
        language: z.string(),
        text: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const [translation] = await db
        .insert(ideaTranslations)
        .values(input)
        .onConflictDoUpdate({
          target: [ideaTranslations.ideaId, ideaTranslations.language],
          set: { text: input.text },
        })
        .returning();
      return translation;
    }),
});
