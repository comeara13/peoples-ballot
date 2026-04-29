import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import {
  affiliations,
  ballots,
  RACE_ETHNICITY_CATEGORIES,
  voterAffiliations,
  voterRaceEthnicity,
  voters,
} from "../db/schema";

const registerInput = z.object({
  // ballotId links the voter to their ballot immediately upon registration.
  ballotId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  addressStreet: z.string().min(1),
  addressCity: z.string().min(1),
  addressState: z.string().trim().toUpperCase().length(2),
  addressZip: z
    .string()
    .transform((v) => v.replace(/-\d{4}$/, ""))
    .pipe(z.string().regex(/^\d{5}$/)),
  raceEthnicityCategories: z
    .array(z.enum(RACE_ETHNICITY_CATEGORIES))
    .min(1)
    .refine((cats) => !(cats.includes("prefer_not_to_say") && cats.length > 1), {
      message: '"Prefer not to say" cannot be combined with other selections.',
    }),
  affiliationIds: z.array(z.string().uuid()),
  consentedAt: z.string().datetime(),
});

export const votersRouter = router({
  listAffiliations: publicProcedure.query(() =>
    db.select().from(affiliations).orderBy(asc(affiliations.type), asc(affiliations.name)),
  ),

  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    return db.transaction(async (tx) => {
      // Lock the ballot row so concurrent registrations on the same ballot
      // queue up rather than both passing the voterId check.
      const [ballot] = await tx
        .select({ id: ballots.id, voterId: ballots.voterId })
        .from(ballots)
        .where(eq(ballots.id, input.ballotId))
        .for("update");

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND", message: "Ballot not found." });
      if (ballot.voterId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This ballot already has a registered voter.",
        });
      }

      const [voter] = await tx
        .insert(voters)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          addressStreet: input.addressStreet,
          addressCity: input.addressCity,
          addressState: input.addressState,
          addressZip: input.addressZip,
          consentedAt: new Date(input.consentedAt),
        })
        .returning();

      if (input.raceEthnicityCategories.length > 0) {
        await tx.insert(voterRaceEthnicity).values(
          input.raceEthnicityCategories.map((category) => ({
            voterId: voter.id,
            category,
          })),
        );
      }

      if (input.affiliationIds.length > 0) {
        await tx.insert(voterAffiliations).values(
          input.affiliationIds.map((affiliationId) => ({
            voterId: voter.id,
            affiliationId,
          })),
        );
      }

      // Link voter to their ballot.
      await tx.update(ballots).set({ voterId: voter.id }).where(eq(ballots.id, input.ballotId));

      return { id: voter.id };
    });
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const [voter] = await db.select().from(voters).where(eq(voters.id, input.id));

    if (!voter) throw new TRPCError({ code: "NOT_FOUND" });

    const raceCategories = await db
      .select({ category: voterRaceEthnicity.category })
      .from(voterRaceEthnicity)
      .where(eq(voterRaceEthnicity.voterId, input.id));

    const affiliationRows = await db
      .select({ id: affiliations.id, name: affiliations.name, type: affiliations.type })
      .from(voterAffiliations)
      .innerJoin(affiliations, eq(affiliations.id, voterAffiliations.affiliationId))
      .where(eq(voterAffiliations.voterId, input.id));

    return {
      ...voter,
      raceEthnicityCategories: raceCategories.map((r) => r.category),
      affiliations: affiliationRows,
    };
  }),
});
