import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { parties, ballots, ballotPairs, votes } from "../db/schema";

export const partiesRouter = router({
  create: adminProcedure
    .input(
      z.object({
        ideaBankId: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        title: z.string().min(1).max(200).optional(),
        subtitle: z.string().min(1).max(500).optional(),
        headerImageUrl: z.string().url().startsWith("https://").optional(),
        mode: z.enum(["standard", "always_on"]).default("standard"),
        defaultPairCount: z.number().int().min(1).max(50).optional(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [party] = await db
        .insert(parties)
        .values({
          ideaBankId: input.ideaBankId,
          name: input.name,
          title: input.title ?? null,
          subtitle: input.subtitle ?? null,
          headerImageUrl: input.headerImageUrl ?? null,
          mode: input.mode,
          defaultPairCount: input.defaultPairCount ?? null,
          startAt: input.startAt ? new Date(input.startAt) : new Date(),
          endAt: input.endAt ? new Date(input.endAt) : undefined,
        })
        .returning();
      return party;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200).optional(),
        title: z.string().min(1).max(200).nullable().optional(),
        subtitle: z.string().min(1).max(500).nullable().optional(),
        headerImageUrl: z.string().url().startsWith("https://").nullable().optional(),
        questionHeading: z.string().min(1).max(500).nullable().optional(),
        defaultPairCount: z.number().int().min(1).max(50).nullable().optional(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [existing] = await db.select().from(parties).where(eq(parties.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "closed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a closed party." });

      const [updated] = await db
        .update(parties)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
          ...(input.headerImageUrl !== undefined && { headerImageUrl: input.headerImageUrl }),
          ...(input.questionHeading !== undefined && { questionHeading: input.questionHeading }),
          ...(input.defaultPairCount !== undefined && { defaultPairCount: input.defaultPairCount }),
          ...(input.startAt !== undefined && { startAt: new Date(input.startAt) }),
          ...(input.endAt !== undefined && { endAt: input.endAt ? new Date(input.endAt) : null }),
        })
        .where(eq(parties.id, input.id))
        .returning();

      return updated;
    }),

  listByBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: parties.id,
          name: parties.name,
          title: parties.title,
          subtitle: parties.subtitle,
          headerImageUrl: parties.headerImageUrl,
          questionHeading: parties.questionHeading,
          mode: parties.mode,
          defaultPairCount: parties.defaultPairCount,
          status: parties.status,
          startAt: parties.startAt,
          endAt: parties.endAt,
          createdAt: parties.createdAt,
          ballotCount: sql<number>`COUNT(DISTINCT ${ballots.id})::int`,
          voteCount: sql<number>`COUNT(DISTINCT ${votes.id})::int`,
        })
        .from(parties)
        .leftJoin(ballots, eq(ballots.partyId, parties.id))
        .leftJoin(ballotPairs, eq(ballotPairs.ballotId, ballots.id))
        .leftJoin(votes, eq(votes.ballotPairId, ballotPairs.id))
        .where(eq(parties.ideaBankId, input.ideaBankId))
        .groupBy(parties.id)
        .orderBy(desc(parties.createdAt));
    }),

  close: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    const [party] = await db.select().from(parties).where(eq(parties.id, input.id));

    if (!party) throw new TRPCError({ code: "NOT_FOUND" });
    if (party.status === "closed")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Party is already closed." });

    const [updated] = await db
      .update(parties)
      .set({ status: "closed", endAt: new Date() })
      .where(eq(parties.id, input.id))
      .returning();

    return updated;
  }),
});
