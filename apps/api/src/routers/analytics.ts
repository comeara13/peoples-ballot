import { z } from "zod";
import { eq, count, inArray, or, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../db";
import {
  ideaBanks,
  ideas,
  ideaTranslations,
  ballotPairs,
  ballots,
  parties,
  voters,
  votes,
  ideaTags,
  tags,
} from "../db/schema";
import { computeZipFilteredScores, type ZipFilteredVote } from "../analyticsScoring";

const zipCodesInput = z.array(z.string()).optional();

export const analyticsRouter = router({
  // Distinct zips (with vote counts) among voters who cast a vote on this bank's
  // ideas, plus how many of those votes have no attributable zip (anonymous
  // ballots, or a linked voter with no zip on file) — the "Unknown" bucket.
  zipOptions: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({ zip: voters.addressZip, count: count() })
        .from(votes)
        .innerJoin(ballotPairs, eq(ballotPairs.id, votes.ballotPairId))
        .innerJoin(ballots, eq(ballots.id, ballotPairs.ballotId))
        .innerJoin(parties, eq(parties.id, ballots.partyId))
        .leftJoin(voters, eq(voters.id, ballots.voterId))
        .where(and(eq(parties.ideaBankId, input.ideaBankId), ne(votes.selection, "cant_decide")))
        .groupBy(voters.addressZip);

      const zips = rows
        .filter((r): r is { zip: string; count: number } => r.zip !== null)
        .map((r) => ({ zip: r.zip, count: r.count }))
        .sort((a, b) => b.count - a.count || a.zip.localeCompare(b.zip));

      const unknownCount = rows.find((r) => r.zip === null)?.count ?? 0;

      return { zips, unknownCount };
    }),

  // Idea list with wins/losses/score/voteCount recomputed from only the votes
  // matching zipCodes (see computeZipFilteredScores for filter semantics).
  ideaScores: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid(), zipCodes: zipCodesInput }))
    .query(async ({ input }) => {
      const [bank] = await db.select().from(ideaBanks).where(eq(ideaBanks.id, input.ideaBankId));
      if (!bank) throw new TRPCError({ code: "NOT_FOUND" });

      const ideasList = await db.select().from(ideas).where(eq(ideas.ideaBankId, input.ideaBankId));
      const ideaIds = ideasList.map((i) => i.id);

      const translations =
        ideaIds.length > 0
          ? await db.select().from(ideaTranslations).where(inArray(ideaTranslations.ideaId, ideaIds))
          : [];

      const ideaTagRows =
        ideaIds.length > 0
          ? await db
              .select({ ideaId: ideaTags.ideaId, tag: tags })
              .from(ideaTags)
              .innerJoin(tags, eq(tags.id, ideaTags.tagId))
              .where(inArray(ideaTags.ideaId, ideaIds))
          : [];

      const pairsForIdeas =
        ideaIds.length > 0
          ? await db
              .select({
                id: ballotPairs.id,
                leftIdeaId: ballotPairs.leftIdeaId,
                rightIdeaId: ballotPairs.rightIdeaId,
              })
              .from(ballotPairs)
              .where(
                or(
                  inArray(ballotPairs.leftIdeaId, ideaIds),
                  inArray(ballotPairs.rightIdeaId, ideaIds),
                ),
              )
          : [];

      const pairIds = pairsForIdeas.map((p) => p.id);
      const pairById = new Map(pairsForIdeas.map((p) => [p.id, p]));

      const voteRows =
        pairIds.length > 0
          ? await db
              .select({
                ballotPairId: votes.ballotPairId,
                selection: votes.selection,
                zip: voters.addressZip,
              })
              .from(votes)
              .innerJoin(ballotPairs, eq(ballotPairs.id, votes.ballotPairId))
              .innerJoin(ballots, eq(ballots.id, ballotPairs.ballotId))
              .leftJoin(voters, eq(voters.id, ballots.voterId))
              .where(and(inArray(votes.ballotPairId, pairIds), ne(votes.selection, "cant_decide")))
          : [];

      const voteFacts: ZipFilteredVote[] = voteRows.map((v) => {
        const pair = pairById.get(v.ballotPairId)!;
        return {
          selection: v.selection as "left" | "right",
          leftIdeaId: pair.leftIdeaId,
          rightIdeaId: pair.rightIdeaId,
          zip: v.zip,
        };
      });

      const scores = computeZipFilteredScores(ideaIds, voteFacts, input.zipCodes);
      const ideaById = new Map(ideasList.map((i) => [i.id, i]));

      const translationsByIdeaId = new Map<string, typeof translations>();
      for (const t of translations) {
        if (!translationsByIdeaId.has(t.ideaId)) translationsByIdeaId.set(t.ideaId, []);
        translationsByIdeaId.get(t.ideaId)!.push(t);
      }
      const tagsByIdeaId = new Map<string, typeof ideaTagRows>();
      for (const r of ideaTagRows) {
        if (!tagsByIdeaId.has(r.ideaId)) tagsByIdeaId.set(r.ideaId, []);
        tagsByIdeaId.get(r.ideaId)!.push(r);
      }

      return scores.map((s) => {
        const idea = ideaById.get(s.ideaId)!;
        return {
          ...idea,
          wins: s.wins,
          losses: s.losses,
          score: s.score,
          voteCount: s.voteCount,
          translations: translationsByIdeaId.get(idea.id) ?? [],
          tags: (tagsByIdeaId.get(idea.id) ?? []).map((r) => r.tag),
        };
      });
    }),
});
