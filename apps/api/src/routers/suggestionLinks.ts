import { z } from "zod";
import { and, eq, notInArray, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import {
  suggestionIdeaLinks,
  suggestedIdeas,
  ideas,
  ideaTranslations,
  voters,
} from "../db/schema";

export const suggestionLinksRouter = router({
  link: publicProcedure
    .input(z.object({ suggestionId: z.string().uuid(), ideaId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [suggestion] = await db
        .select({ ideaBankId: suggestedIdeas.ideaBankId })
        .from(suggestedIdeas)
        .where(eq(suggestedIdeas.id, input.suggestionId));
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found." });

      const [idea] = await db
        .select({ ideaBankId: ideas.ideaBankId })
        .from(ideas)
        .where(eq(ideas.id, input.ideaId));
      if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found." });

      if (suggestion.ideaBankId !== idea.ideaBankId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Idea and suggestion must belong to the same bank." });

      await db
        .insert(suggestionIdeaLinks)
        .values({ suggestionId: input.suggestionId, ideaId: input.ideaId })
        .onConflictDoNothing();
    }),

  unlink: publicProcedure
    .input(z.object({ suggestionId: z.string().uuid(), ideaId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db
        .delete(suggestionIdeaLinks)
        .where(
          and(
            eq(suggestionIdeaLinks.suggestionId, input.suggestionId),
            eq(suggestionIdeaLinks.ideaId, input.ideaId),
          ),
        );
    }),

  listForIdea: publicProcedure
    .input(z.object({ ideaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
          status: suggestedIdeas.status,
          createdAt: suggestedIdeas.createdAt,
          voterFirstName: voters.firstName,
          voterLastName: voters.lastName,
        })
        .from(suggestionIdeaLinks)
        .innerJoin(suggestedIdeas, eq(suggestedIdeas.id, suggestionIdeaLinks.suggestionId))
        .leftJoin(voters, eq(voters.id, suggestedIdeas.voterId))
        .where(eq(suggestionIdeaLinks.ideaId, input.ideaId));
      return rows;
    }),

  listForSuggestion: publicProcedure
    .input(z.object({ suggestionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: ideas.id,
          enText: ideaTranslations.text,
        })
        .from(suggestionIdeaLinks)
        .innerJoin(ideas, eq(ideas.id, suggestionIdeaLinks.ideaId))
        .leftJoin(
          ideaTranslations,
          and(eq(ideaTranslations.ideaId, ideas.id), eq(ideaTranslations.language, "en")),
        )
        .where(eq(suggestionIdeaLinks.suggestionId, input.suggestionId));
      return rows;
    }),

  candidateSuggestions: publicProcedure
    .input(z.object({ ideaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [idea] = await db
        .select({ ideaBankId: ideas.ideaBankId })
        .from(ideas)
        .where(eq(ideas.id, input.ideaId));
      if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found." });

      const linked = await db
        .select({ suggestionId: suggestionIdeaLinks.suggestionId })
        .from(suggestionIdeaLinks)
        .where(eq(suggestionIdeaLinks.ideaId, input.ideaId));
      const linkedIds = linked.map((r) => r.suggestionId);

      const rows = await db
        .select({
          id: suggestedIdeas.id,
          text: suggestedIdeas.text,
          status: suggestedIdeas.status,
        })
        .from(suggestedIdeas)
        .where(
          and(
            eq(suggestedIdeas.ideaBankId, idea.ideaBankId),
            linkedIds.length > 0 ? notInArray(suggestedIdeas.id, linkedIds) : undefined,
          ),
        );
      return rows;
    }),

  candidateIdeas: publicProcedure
    .input(z.object({ suggestionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [suggestion] = await db
        .select({ ideaBankId: suggestedIdeas.ideaBankId })
        .from(suggestedIdeas)
        .where(eq(suggestedIdeas.id, input.suggestionId));
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found." });

      const linked = await db
        .select({ ideaId: suggestionIdeaLinks.ideaId })
        .from(suggestionIdeaLinks)
        .where(eq(suggestionIdeaLinks.suggestionId, input.suggestionId));
      const linkedIds = linked.map((r) => r.ideaId);

      const rows = await db
        .select({
          id: ideas.id,
          enText: ideaTranslations.text,
        })
        .from(ideas)
        .leftJoin(
          ideaTranslations,
          and(eq(ideaTranslations.ideaId, ideas.id), eq(ideaTranslations.language, "en")),
        )
        .where(
          and(
            eq(ideas.ideaBankId, suggestion.ideaBankId),
            eq(ideas.isActive, true),
            linkedIds.length > 0 ? notInArray(ideas.id, linkedIds) : undefined,
          ),
        );
      return rows;
    }),
});
