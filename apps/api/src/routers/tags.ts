import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { TAG_TYPES, tags } from "../db/schema";

export const tagsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        type: z.enum(TAG_TYPES).optional(),
        includeArchived: z.boolean().default(false),
      }).optional(),
    )
    .query(({ input }) => {
      const conditions = [];
      if (input?.type) conditions.push(eq(tags.type, input.type));
      if (!input?.includeArchived) conditions.push(isNull(tags.archivedAt));

      return db
        .select()
        .from(tags)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(tags.type, tags.name);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).trim(),
        type: z.enum(TAG_TYPES),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(tags)
        .values({ name: input.name, type: input.type })
        .onConflictDoNothing()
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A "${input.type}" tag named "${input.name}" already exists.`,
        });
      }

      return row;
    }),

  archive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(tags)
        .set({ archivedAt: new Date() })
        .where(and(eq(tags.id, input.id), isNull(tags.archivedAt)))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      return row;
    }),

  unarchive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(tags)
        .set({ archivedAt: null })
        .where(eq(tags.id, input.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      return row;
    }),
});
