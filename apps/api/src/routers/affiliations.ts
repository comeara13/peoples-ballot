import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { affiliations, ballots, parties, voterAffiliations } from "../db/schema";

export const affiliationsRouter = router({
  listForBank: publicProcedure
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
      const [ballot] = await db
        .select({ partyId: ballots.partyId })
        .from(ballots)
        .where(eq(ballots.id, input.ballotId));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND", message: "Ballot not found." });

      const [party] = await db
        .select({ ideaBankId: parties.ideaBankId })
        .from(parties)
        .where(eq(parties.id, ballot.partyId));

      if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "Party not found." });

      return db
        .select({ id: affiliations.id, name: affiliations.name })
        .from(affiliations)
        .where(eq(affiliations.ideaBankId, party.ideaBankId))
        .orderBy(asc(affiliations.name));
    }),

  create: publicProcedure
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

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [inUse] = await db
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

      await db.delete(affiliations).where(eq(affiliations.id, input.id));
    }),
});
