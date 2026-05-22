import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { affiliations, ballots, parties, voterAffiliations } from "../db/schema";

export const affiliationsRouter = router({
  listForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(({ input }) =>
      db
        .select({ id: affiliations.id, name: affiliations.name })
        .from(affiliations)
        .where(eq(affiliations.ideaBankId, input.ideaBankId))
        .orderBy(asc(affiliations.name)),
    ),

  listForBallot: publicProcedure
    .input(z.object({ ballotId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({ ideaBankId: parties.ideaBankId })
        .from(ballots)
        .innerJoin(parties, eq(parties.id, ballots.partyId))
        .where(eq(ballots.id, input.ballotId));

      // No match means ballot doesn't exist or has no party — return empty list.
      if (!row) return [];

      return db
        .select({ id: affiliations.id, name: affiliations.name })
        .from(affiliations)
        .where(eq(affiliations.ideaBankId, row.ideaBankId))
        .orderBy(asc(affiliations.name));
    }),

  // TODO: restrict create/delete to admin once Clerk auth is wired up.

  create: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid(), name: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(affiliations)
        .values({ ideaBankId: input.ideaBankId, name: input.name.trim() })
        .onConflictDoNothing()
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A group with that name already exists for this campaign.",
        });
      }

      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        const [inUse] = await tx
          .select({ affiliationId: voterAffiliations.affiliationId })
          .from(voterAffiliations)
          .where(eq(voterAffiliations.affiliationId, input.id))
          .limit(1);

        if (inUse) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This group has been selected by voters and can't be deleted.",
          });
        }

        await tx.delete(affiliations).where(eq(affiliations.id, input.id));
      });
    }),
});
