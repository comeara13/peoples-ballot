import { z } from "zod";
import { eq, count, inArray, or, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { ideaBanks, ideas, ideaTranslations, ballotPairs, votes, ideaTags, tags, glossaryTerms, ideaGlossaryTerms } from "../db/schema";
import { computeScore } from "../scoring";

export const ideaBanksRouter = router({
  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(200),
        title: z.string().min(1).max(200).optional(),
        subtitle: z.string().min(1).max(500).optional(),
        headerImageUrl: z.string().url().startsWith("https://").optional(),
        questionHeading: z.string().min(1).max(500).optional(),
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
          questionHeading: input.questionHeading ?? null,
        })
        .returning();
      return bank;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200).optional(),
        title: z.string().min(1).max(200).nullable().optional(),
        subtitle: z.string().min(1).max(500).nullable().optional(),
        headerImageUrl: z.string().url().startsWith("https://").nullable().optional(),
        postVoteMessage: z.string().min(1).max(500).nullable().optional(),
        questionHeading: z.string().min(1).max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(ideaBanks)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
          ...(input.headerImageUrl !== undefined && { headerImageUrl: input.headerImageUrl }),
          ...(input.postVoteMessage !== undefined && { postVoteMessage: input.postVoteMessage }),
          ...(input.questionHeading !== undefined && { questionHeading: input.questionHeading }),
        })
        .where(eq(ideaBanks.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
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
        postVoteMessage: ideaBanks.postVoteMessage,
        createdAt: ideaBanks.createdAt,
        ideaCount: count(ideas.id),
      })
      .from(ideaBanks)
      .leftJoin(ideas, eq(ideas.ideaBankId, ideaBanks.id))
      .groupBy(ideaBanks.id)
      .orderBy(ideaBanks.createdAt);
  }),

  getById: adminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
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

    const ideaGlossaryRows =
      ideaIds.length > 0
        ? await db
            .select({ ideaId: ideaGlossaryTerms.ideaId, term: glossaryTerms })
            .from(ideaGlossaryTerms)
            .innerJoin(glossaryTerms, eq(glossaryTerms.id, ideaGlossaryTerms.termId))
            .where(inArray(ideaGlossaryTerms.ideaId, ideaIds))
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

    // Pre-build maps to avoid O(n×m) filtering inside the ideas loop.
    const translationsByIdeaId = new Map<string, typeof translations>();
    for (const t of translations) {
      if (!translationsByIdeaId.has(t.ideaId)) translationsByIdeaId.set(t.ideaId, []);
      translationsByIdeaId.get(t.ideaId)!.push(t);
    }
    const tagsByIdeaId = new Map<string, typeof ideaTagRows>();
    for (const r of ideaTagRows) {
      if (!tagsByIdeaId.has(r.ideaId)) tagsByIdeaId.set(r.ideaId, []);
      tagsByIdeaId.get(r.ideaId)!.push(r);
    }
    const glossaryByIdeaId = new Map<string, typeof ideaGlossaryRows>();
    for (const r of ideaGlossaryRows) {
      if (!glossaryByIdeaId.has(r.ideaId)) glossaryByIdeaId.set(r.ideaId, []);
      glossaryByIdeaId.get(r.ideaId)!.push(r);
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
            translations: translationsByIdeaId.get(idea.id) ?? [],
            tags: (tagsByIdeaId.get(idea.id) ?? []).map((r) => r.tag),
            glossaryTerms: (glossaryByIdeaId.get(idea.id) ?? []).map((r) => r.term),
          };
        })
        .sort((a, b) => b.score - a.score || b.wins - a.wins),
    };
  }),

  createIdea: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [idea] = await db.insert(ideas).values(input).returning();
      return idea;
    }),

  setIdeaTags: adminProcedure
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

  upsertTranslation: adminProcedure
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
