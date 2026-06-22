import { z } from "zod";
import { eq, asc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import {
  assessmentQuestions,
  assessmentResponses,
  ballots,
  GENDER_OPTIONS,
  parties,
  postAssessmentResponses,
  RACE_ETHNICITY_CATEGORIES,
  voterRaceEthnicity,
  voters,
} from "../db/schema";
import { isValidSurveyValue } from "../surveyValidation";

export const assessmentRouter = router({
  listQuestionsForBallot: publicProcedure
    .input(z.object({ ballotId: z.string().uuid(), stage: z.enum(["pre", "post"]) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({ ideaBankId: parties.ideaBankId })
        .from(ballots)
        .innerJoin(parties, eq(parties.id, ballots.partyId))
        .where(eq(ballots.id, input.ballotId));

      if (!row) return [];

      return db
        .select()
        .from(assessmentQuestions)
        .where(
          and(eq(assessmentQuestions.ideaBankId, row.ideaBankId), eq(assessmentQuestions.stage, input.stage)),
        )
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt));
    }),

  listQuestionsForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid(), stage: z.enum(["pre", "post"]) }))
    .query(({ input }) =>
      db
        .select()
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.ideaBankId, input.ideaBankId),
            eq(assessmentQuestions.stage, input.stage),
          ),
        )
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt)),
    ),

  createQuestion: adminProcedure
    .input(
      z.object({
        ideaBankId: z.string().uuid(),
        text: z.string().min(1).max(500),
        type: z.enum(["likert", "yes_no"]),
        stage: z.enum(["pre", "post"]),
        position: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let position = input.position;

      if (position === undefined) {
        const [max] = await db
          .select({ maxPos: sql<number>`coalesce(max(${assessmentQuestions.position}), -1)` })
          .from(assessmentQuestions)
          .where(
            and(eq(assessmentQuestions.ideaBankId, input.ideaBankId), eq(assessmentQuestions.stage, input.stage)),
          );
        position = (max?.maxPos ?? -1) + 1;
      }

      const [row] = await db
        .insert(assessmentQuestions)
        .values({ ideaBankId: input.ideaBankId, text: input.text, type: input.type, stage: input.stage, position })
        .returning();

      return row;
    }),

  deleteQuestion: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .delete(assessmentQuestions)
        .where(eq(assessmentQuestions.id, input.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    }),

  submitPostVoteResponses: publicProcedure
    .input(
      z.object({
        ballotId: z.string().uuid(),
        responses: z.array(z.object({ questionId: z.string().uuid(), value: z.string().min(1) })),
        raceEthnicityCategories: z
          .array(z.enum(RACE_ETHNICITY_CATEGORIES))
          .min(1, "Race/ethnicity selection is required.")
          .refine((cats) => !(cats.includes("prefer_not_to_say") && cats.length > 1), {
            message: '"Prefer not to say" cannot be combined with other selections.',
          }),
        birthYear: z
          .number()
          .int()
          .min(1920)
          .max(new Date().getFullYear())
          .nullable(),
        gender: z.enum(GENDER_OPTIONS),
      }),
    )
    .mutation(async ({ input }) => {
      const [ballot] = await db
        .select({ id: ballots.id, status: ballots.status, ideaBankId: parties.ideaBankId, voterId: ballots.voterId })
        .from(ballots)
        .innerJoin(parties, eq(parties.id, ballots.partyId))
        .where(eq(ballots.id, input.ballotId));

      if (!ballot) throw new TRPCError({ code: "NOT_FOUND", message: "Ballot not found." });
      if (ballot.status !== "submitted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post-vote survey can only be submitted after the ballot is submitted.",
        });
      }

      const bankQuestions = await db
        .select({ id: assessmentQuestions.id, type: assessmentQuestions.type })
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.ideaBankId, ballot.ideaBankId),
            eq(assessmentQuestions.stage, "post"),
          ),
        );

      const questionMap = new Map(bankQuestions.map((q) => [q.id, q.type]));
      const answeredIds = new Set(input.responses.map((r) => r.questionId));

      if (bankQuestions.length > 0 && !bankQuestions.every((q) => answeredIds.has(q.id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All survey questions must be answered.",
        });
      }

      for (const r of input.responses) {
        const type = questionMap.get(r.questionId);
        if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid question ID." });
        if (!isValidSurveyValue(type, r.value))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid response value." });
      }

      if (input.responses.length > 0) {
        await db
          .insert(postAssessmentResponses)
          .values(
            input.responses.map((r) => ({
              ballotId: input.ballotId,
              questionId: r.questionId,
              value: r.value,
            })),
          )
          .onConflictDoNothing();
      }

      if (ballot.voterId) {
        await db
          .insert(voterRaceEthnicity)
          .values(input.raceEthnicityCategories.map((category) => ({ voterId: ballot.voterId!, category })))
          .onConflictDoNothing();

        await db
          .update(voters)
          .set({ birthYear: input.birthYear, gender: input.gender })
          .where(eq(voters.id, ballot.voterId));
      }

      return { success: true };
    }),

  resultsForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid(), stage: z.enum(["pre", "post"]) }))
    .query(async ({ input }) => {
      const questions = await db
        .select()
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.ideaBankId, input.ideaBankId),
            eq(assessmentQuestions.stage, input.stage),
          ),
        )
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt));

      if (questions.length === 0) return [];

      const responseTable =
        input.stage === "post" ? postAssessmentResponses : assessmentResponses;

      return Promise.all(
        questions.map(async (q) => {
          const responses = await db
            .select({ value: responseTable.value })
            .from(responseTable)
            .where(eq(responseTable.questionId, q.id));

          const responseCount = responses.length;

          if (q.type === "likert") {
            const total = responses.reduce((sum, r) => sum + Number(r.value), 0);
            const avgScore = responseCount > 0 ? total / responseCount : null;
            return { ...q, responseCount, avgScore, yesCount: null, noCount: null };
          } else {
            const yesCount = responses.filter((r) => r.value === "yes").length;
            const noCount = responses.filter((r) => r.value === "no").length;
            return { ...q, responseCount, avgScore: null, yesCount, noCount };
          }
        }),
      );
    }),
});
