import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { ballots, parties, suggestedIdeas, voters, GOVERNMENT_LEVELS } from "../db/schema";
import { checkPartyWindow } from "../partyWindow";

export const suggestedIdeasRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        ballotId: z.string().uuid(),
        text: z.string().min(1).max(2000),
        governmentLevels: z.array(z.enum(GOVERNMENT_LEVELS)).default([]),
        testimonial: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [ballot] = await db
        .select()
        .from(ballots)
        .where(eq(ballots.id, input.ballotId));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND", message: "Ballot not found." });
      if (ballot.status === "submitted")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot submit ideas on a completed ballot.",
        });

      const [party] = await db
        .select()
        .from(parties)
        .where(eq(parties.id, ballot.partyId));

      if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "Party not found." });

      const windowCheck = checkPartyWindow(party);
      if (!windowCheck.ok)
        throw new TRPCError({ code: "BAD_REQUEST", message: windowCheck.message });

      const [suggestion] = await db
        .insert(suggestedIdeas)
        .values({
          ballotId: input.ballotId,
          partyId: party.id,
          ideaBankId: party.ideaBankId,
          voterId: ballot.voterId ?? null,
          text: input.text,
          governmentLevels: input.governmentLevels,
          testimonial: input.testimonial ?? null,
        })
        .returning();

      return suggestion;
    }),

  listByParty: publicProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
          governmentLevels: suggestedIdeas.governmentLevels,
          testimonial: suggestedIdeas.testimonial,
          status: suggestedIdeas.status,
          createdAt: suggestedIdeas.createdAt,
          voterFirstName: voters.firstName,
          voterLastName: voters.lastName,
        })
        .from(suggestedIdeas)
        .leftJoin(voters, eq(voters.id, suggestedIdeas.voterId))
        .where(eq(suggestedIdeas.partyId, input.partyId))
        .orderBy(desc(suggestedIdeas.createdAt));
    }),

  listByBank: publicProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
          governmentLevels: suggestedIdeas.governmentLevels,
          testimonial: suggestedIdeas.testimonial,
          status: suggestedIdeas.status,
          createdAt: suggestedIdeas.createdAt,
          partyName: parties.name,
          voterFirstName: voters.firstName,
          voterLastName: voters.lastName,
        })
        .from(suggestedIdeas)
        .innerJoin(parties, eq(parties.id, suggestedIdeas.partyId))
        .leftJoin(voters, eq(voters.id, suggestedIdeas.voterId))
        .where(eq(suggestedIdeas.ideaBankId, input.ideaBankId))
        .orderBy(desc(suggestedIdeas.createdAt));
    }),
});
