import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { votes, ballotPairs, prompts, ideas } from "../db/schema";

export const votesRouter = router({
  create: publicProcedure
    .input(
      z.object({
        ballotPairId: z.string().uuid(),
        selection: z.enum(["left", "right", "cant_decide"]),
      }),
    )
    .mutation(async ({ input }) => {
      const [pair] = await db
        .select()
        .from(ballotPairs)
        .where(eq(ballotPairs.id, input.ballotPairId));

      if (!pair) throw new TRPCError({ code: "NOT_FOUND" });

      await db.transaction(async (tx) => {
        await tx.insert(votes).values({
          ballotPairId: input.ballotPairId,
          selection: input.selection,
        });

        // cant_decide: record the vote but exclude from scores and prompt weight
        if (input.selection === "cant_decide") return;

        const winnerId =
          input.selection === "left" ? pair.leftIdeaId : pair.rightIdeaId;
        const loserId =
          input.selection === "left" ? pair.rightIdeaId : pair.leftIdeaId;

        // Only actual votes increment prompt.votes_count (drives catchup weights)
        await tx
          .update(prompts)
          .set({ votesCount: sql`${prompts.votesCount} + 1` })
          .where(eq(prompts.id, pair.promptId));

        // Winner: new_score = (wins + 2) / (wins + losses + 3) * 100
        // (SET evaluates against pre-update values, so wins+2 = new_wins+1 after increment)
        await tx
          .update(ideas)
          .set({
            wins: sql`${ideas.wins} + 1`,
            score: sql`(${ideas.wins} + 2.0) / (${ideas.wins} + ${ideas.losses} + 3.0) * 100`,
          })
          .where(eq(ideas.id, winnerId));

        // Loser: new_score = (wins + 1) / (wins + losses + 3) * 100
        await tx
          .update(ideas)
          .set({
            losses: sql`${ideas.losses} + 1`,
            score: sql`(${ideas.wins} + 1.0) / (${ideas.wins} + ${ideas.losses} + 3.0) * 100`,
          })
          .where(eq(ideas.id, loserId));
      });
    }),
});
