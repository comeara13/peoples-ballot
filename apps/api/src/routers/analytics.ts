import { z } from "zod";
import { eq, count, inArray, or, and, ne, isNull, sql, type SQL } from "drizzle-orm";
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
import { parseZipFilter, assembleIdeaScores, type ZipFilter } from "../analyticsScoring";

const zipCodesInput = z.array(z.string()).optional();

/** WHERE condition restricting votes to the selected zips (undefined = no filter). */
function zipCondition(filter: ZipFilter): SQL | undefined {
  if (!filter.active) return undefined;
  return filter.includeUnknown
    ? or(inArray(voters.addressZip, filter.realZips), isNull(voters.addressZip))
    : inArray(voters.addressZip, filter.realZips);
}

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
  // matching zipCodes. Win/loss counting happens in SQL (GROUP BY) rather than
  // materializing every vote row in Node — this scales with idea count, not
  // vote history size.
  ideaScores: adminProcedure
    .input(z.object({ ideaBankId: z.string().uuid(), zipCodes: zipCodesInput }))
    .query(async ({ input }) => {
      const [[bank], ideasList] = await Promise.all([
        db.select().from(ideaBanks).where(eq(ideaBanks.id, input.ideaBankId)),
        db.select().from(ideas).where(eq(ideas.ideaBankId, input.ideaBankId)),
      ]);
      if (!bank) throw new TRPCError({ code: "NOT_FOUND" });

      const ideaIds = ideasList.map((i) => i.id);
      if (ideaIds.length === 0) return [];

      const filter = parseZipFilter(input.zipCodes);
      const zipWhere = zipCondition(filter);

      // Pivots each vote onto its winner's row (or loser's row) so wins/losses
      // land on the correct idea regardless of which side of the pair it was on.
      const winnerId = sql<string>`case when ${votes.selection} = 'left' then ${ballotPairs.leftIdeaId} else ${ballotPairs.rightIdeaId} end`;
      const loserId = sql<string>`case when ${votes.selection} = 'left' then ${ballotPairs.rightIdeaId} else ${ballotPairs.leftIdeaId} end`;

      function outcomeQuery(ideaIdExpr: SQL<string>) {
        return db
          .select({ ideaId: ideaIdExpr, total: count() })
          .from(votes)
          .innerJoin(ballotPairs, eq(ballotPairs.id, votes.ballotPairId))
          .innerJoin(ballots, eq(ballots.id, ballotPairs.ballotId))
          .leftJoin(voters, eq(voters.id, ballots.voterId))
          .where(
            and(
              ne(votes.selection, "cant_decide"),
              or(inArray(ballotPairs.leftIdeaId, ideaIds), inArray(ballotPairs.rightIdeaId, ideaIds)),
              zipWhere,
            ),
          )
          .groupBy(ideaIdExpr);
      }

      const [winsRows, lossesRows, translations, ideaTagRows] = await Promise.all([
        outcomeQuery(winnerId),
        outcomeQuery(loserId),
        db.select().from(ideaTranslations).where(inArray(ideaTranslations.ideaId, ideaIds)),
        db
          .select({ ideaId: ideaTags.ideaId, tag: tags })
          .from(ideaTags)
          .innerJoin(tags, eq(tags.id, ideaTags.tagId))
          .where(inArray(ideaTags.ideaId, ideaIds)),
      ]);

      const winsByIdea = new Map(winsRows.map((r) => [r.ideaId, r.total]));
      const lossesByIdea = new Map(lossesRows.map((r) => [r.ideaId, r.total]));
      const scores = assembleIdeaScores(ideaIds, winsByIdea, lossesByIdea);
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
