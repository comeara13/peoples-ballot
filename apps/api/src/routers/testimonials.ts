import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { testimonials, ballots, parties } from "../db/schema";

export const testimonialsRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        ballotId: z.string().uuid(),
        suggestionId: z.string().uuid().optional(),
        text: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(testimonials)
        .values({
          ballotId: input.ballotId,
          suggestionId: input.suggestionId ?? null,
          text: input.text,
        })
        .returning();
      return row;
    }),

  listForBallot: adminProcedure
    .input(z.object({ ballotId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(testimonials)
        .where(eq(testimonials.ballotId, input.ballotId))
        .orderBy(desc(testimonials.createdAt));
    }),

  listForParty: adminProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: testimonials.id,
          text: testimonials.text,
          createdAt: testimonials.createdAt,
          ballotId: testimonials.ballotId,
          suggestionId: testimonials.suggestionId,
        })
        .from(testimonials)
        .innerJoin(ballots, eq(ballots.id, testimonials.ballotId))
        .where(eq(ballots.partyId, input.partyId))
        .orderBy(desc(testimonials.createdAt));
    }),

  listForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: testimonials.id,
          text: testimonials.text,
          createdAt: testimonials.createdAt,
          ballotId: testimonials.ballotId,
          suggestionId: testimonials.suggestionId,
          partyName: parties.name,
        })
        .from(testimonials)
        .innerJoin(ballots, eq(ballots.id, testimonials.ballotId))
        .innerJoin(parties, eq(parties.id, ballots.partyId))
        .where(eq(parties.ideaBankId, input.ideaBankId))
        .orderBy(desc(testimonials.createdAt));
    }),
});
