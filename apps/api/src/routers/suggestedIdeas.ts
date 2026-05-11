import { z } from "zod";
import { count, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { ballots, parties, suggestedIdeas, voters, suggestionTags, tags, suggestionIdeaLinks } from "../db/schema";
import { checkPartyWindow } from "../partyWindow";

export const suggestedIdeasRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        ballotId: z.string().uuid(),
        text: z.string().min(1).max(2000),
        tagIds: z.array(z.string().uuid()).default([]),
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
          testimonial: input.testimonial ?? null,
        })
        .returning();

      if (input.tagIds.length > 0) {
        const foundTags = await db
          .select({ id: tags.id })
          .from(tags)
          .where(inArray(tags.id, input.tagIds));
        if (foundTags.length !== input.tagIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tag IDs not found." });
        }
        await db
          .insert(suggestionTags)
          .values(input.tagIds.map((tagId) => ({ suggestionId: suggestion.id, tagId })));
      }

      return suggestion;
    }),

  listByParty: publicProcedure
    .input(z.object({ partyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
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

      return attachLinkCounts(await attachTagsToSuggestions(rows));
    }),

  listByBank: publicProcedure
    .input(z.object({ ideaBankId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
          testimonial: suggestedIdeas.testimonial,
          status: suggestedIdeas.status,
          createdAt: suggestedIdeas.createdAt,
          partyName: parties.name,
          voterFirstName: voters.firstName,
          voterLastName: voters.lastName,
        })
        .from(suggestedIdeas)
        .leftJoin(parties, eq(parties.id, suggestedIdeas.partyId))
        .leftJoin(voters, eq(voters.id, suggestedIdeas.voterId))
        .where(eq(suggestedIdeas.ideaBankId, input.ideaBankId))
        .orderBy(desc(suggestedIdeas.createdAt));

      return attachLinkCounts(await attachTagsToSuggestions(rows));
    }),
});

async function attachLinkCounts<T extends { id: string }>(
  rows: T[],
): Promise<(T & { linkedIdeaCount: number })[]> {
  if (rows.length === 0) return rows.map((r) => ({ ...r, linkedIdeaCount: 0 }));

  const suggestionIds = rows.map((r) => r.id);
  const linkRows = await db
    .select({ suggestionId: suggestionIdeaLinks.suggestionId, cnt: count() })
    .from(suggestionIdeaLinks)
    .where(inArray(suggestionIdeaLinks.suggestionId, suggestionIds))
    .groupBy(suggestionIdeaLinks.suggestionId);

  const countMap = new Map(linkRows.map((r) => [r.suggestionId, Number(r.cnt)]));
  return rows.map((r) => ({ ...r, linkedIdeaCount: countMap.get(r.id) ?? 0 }));
}

async function attachTagsToSuggestions<T extends { id: string }>(
  rows: T[],
): Promise<(T & { tags: (typeof tags.$inferSelect)[] })[]> {
  if (rows.length === 0) return rows.map((r) => ({ ...r, tags: [] }));

  const suggestionIds = rows.map((r) => r.id);
  const tagRows = await db
    .select({ suggestionId: suggestionTags.suggestionId, tag: tags })
    .from(suggestionTags)
    .innerJoin(tags, eq(tags.id, suggestionTags.tagId))
    .where(inArray(suggestionTags.suggestionId, suggestionIds));

  const tagMap = new Map<string, (typeof tags.$inferSelect)[]>();
  for (const { suggestionId, tag } of tagRows) {
    const list = tagMap.get(suggestionId) ?? [];
    list.push(tag);
    tagMap.set(suggestionId, list);
  }

  return rows.map((r) => ({ ...r, tags: tagMap.get(r.id) ?? [] }));
}
