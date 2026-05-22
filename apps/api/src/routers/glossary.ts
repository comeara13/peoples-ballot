import { z } from "zod";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { glossaryTerms, ideaGlossaryTerms } from "../db/schema";

export const glossaryRouter = router({
  list: publicProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
      }).optional(),
    )
    .query(({ input }) => {
      const conditions = [];
      if (!input?.includeArchived) conditions.push(isNull(glossaryTerms.archivedAt));

      return db
        .select()
        .from(glossaryTerms)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(glossaryTerms.title);
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200).trim(),
        body: z.string().min(1).trim(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(glossaryTerms)
        .values({ title: input.title, body: input.body })
        .onConflictDoNothing()
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A glossary term titled "${input.title}" already exists.`,
        });
      }

      return row;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).trim().optional(),
        body: z.string().min(1).trim().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(glossaryTerms)
        .set({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.body !== undefined && { body: input.body }),
        })
        .where(eq(glossaryTerms.id, input.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      return row;
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(glossaryTerms)
        .set({ archivedAt: new Date() })
        .where(and(eq(glossaryTerms.id, input.id), isNull(glossaryTerms.archivedAt)))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      return row;
    }),

  unarchive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(glossaryTerms)
        .set({ archivedAt: null })
        .where(eq(glossaryTerms.id, input.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      return row;
    }),

  setIdeaTerms: adminProcedure
    .input(z.object({ ideaId: z.string().uuid(), termIds: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(ideaGlossaryTerms).where(eq(ideaGlossaryTerms.ideaId, input.ideaId));
        if (input.termIds.length > 0) {
          await tx
            .insert(ideaGlossaryTerms)
            .values(input.termIds.map((termId) => ({ ideaId: input.ideaId, termId })));
        }
      });
    }),

  getIdeaTermIds: publicProcedure
    .input(z.object({ ideaIds: z.array(z.string().uuid()) }))
    .query(async ({ input }) => {
      if (input.ideaIds.length === 0) return [];
      return db
        .select({ ideaId: ideaGlossaryTerms.ideaId, termId: ideaGlossaryTerms.termId })
        .from(ideaGlossaryTerms)
        .where(inArray(ideaGlossaryTerms.ideaId, input.ideaIds));
    }),
});
