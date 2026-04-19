import { z } from "zod";
import { eq, count, inArray, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { ideaBanks, ideas, ideaTranslations } from "../db/schema";

export const ideaBanksRouter = router({
  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const [bank] = await db.insert(ideaBanks).values({ name: input.name }).returning();
      return bank;
    }),

  list: publicProcedure.query(async () => {
    return db
      .select({
        id: ideaBanks.id,
        name: ideaBanks.name,
        createdAt: ideaBanks.createdAt,
        ideaCount: count(ideas.id),
      })
      .from(ideaBanks)
      .leftJoin(ideas, eq(ideas.ideaBankId, ideaBanks.id))
      .groupBy(ideaBanks.id)
      .orderBy(ideaBanks.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [bank] = await db
        .select()
        .from(ideaBanks)
        .where(eq(ideaBanks.id, input.id));

      if (!bank) throw new TRPCError({ code: "NOT_FOUND" });

      const ideasList = await db
        .select()
        .from(ideas)
        .where(eq(ideas.ideaBankId, input.id))
        .orderBy(desc(ideas.score), desc(ideas.wins));

      const translations =
        ideasList.length > 0
          ? await db
              .select()
              .from(ideaTranslations)
              .where(inArray(ideaTranslations.ideaId, ideasList.map((i) => i.id)))
          : [];

      return {
        ...bank,
        ideas: ideasList.map((idea) => ({
          ...idea,
          voteCount: idea.wins + idea.losses,
          translations: translations.filter((t) => t.ideaId === idea.id),
        })),
      };
    }),

  createIdea: publicProcedure
    .input(
      z.object({
        ideaBankId: z.string().uuid(),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [idea] = await db.insert(ideas).values(input).returning();
      return idea;
    }),

  updateIdea: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        category: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const [idea] = await db
        .update(ideas)
        .set({ category: input.category })
        .where(eq(ideas.id, input.id))
        .returning();
      return idea;
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
