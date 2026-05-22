import { z } from "zod";
import { eq, asc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "../db";
import { assessmentQuestions, assessmentResponses, ballots, parties } from "../db/schema";

export const assessmentRouter = router({
  listQuestionsForBallot: publicProcedure
    .input(z.object({ ballotId: z.string().uuid() }))
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
        .where(eq(assessmentQuestions.ideaBankId, row.ideaBankId))
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt));
    }),

  listQuestionsForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(({ input }) =>
      db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.ideaBankId, input.ideaBankId))
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt)),
    ),

  createQuestion: adminProcedure
    .input(
      z.object({
        ideaBankId: z.string().uuid(),
        text: z.string().min(1).max(500),
        type: z.enum(["likert", "yes_no"]),
        position: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let position = input.position;

      if (position === undefined) {
        const [max] = await db
          .select({ maxPos: sql<number>`coalesce(max(${assessmentQuestions.position}), -1)` })
          .from(assessmentQuestions)
          .where(eq(assessmentQuestions.ideaBankId, input.ideaBankId));
        position = (max?.maxPos ?? -1) + 1;
      }

      const [row] = await db
        .insert(assessmentQuestions)
        .values({ ideaBankId: input.ideaBankId, text: input.text, type: input.type, position })
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

  resultsForBank: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      const questions = await db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.ideaBankId, input.ideaBankId))
        .orderBy(asc(assessmentQuestions.position), asc(assessmentQuestions.createdAt));

      if (questions.length === 0) return [];

      return Promise.all(
        questions.map(async (q) => {
          const responses = await db
            .select({ value: assessmentResponses.value })
            .from(assessmentResponses)
            .where(eq(assessmentResponses.questionId, q.id));

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
