import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { votes, ballotPairs, prompts } from "../db/schema";

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

        // cant_decide: record the vote but exclude from prompt weight
        if (input.selection === "cant_decide") return;

        await tx
          .update(prompts)
          .set({ votesCount: sql`${prompts.votesCount} + 1` })
          .where(eq(prompts.id, pair.promptId));
      });
    }),
});
