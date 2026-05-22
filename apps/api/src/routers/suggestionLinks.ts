import { z } from "zod";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import {
  suggestionIdeaLinks,
  suggestedIdeas,
  ideas,
  ideaTranslations,
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
        })
        .from(suggestionIdeaLinks)
        .innerJoin(suggestedIdeas, eq(suggestedIdeas.id, suggestionIdeaLinks.suggestionId))
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
      const alreadyLinked = db
        .select({ one: sql`1` })
        .from(suggestionIdeaLinks)
        .where(
          and(
            eq(suggestionIdeaLinks.ideaId, input.ideaId),
            eq(suggestionIdeaLinks.suggestionId, suggestedIdeas.id),
          ),
        );

      return db
        .select({ id: suggestedIdeas.id, text: suggestedIdeas.text, status: suggestedIdeas.status })
        .from(suggestedIdeas)
        .innerJoin(ideas, eq(ideas.ideaBankId, suggestedIdeas.ideaBankId))
        .where(
          and(
            eq(ideas.id, input.ideaId),
            inArray(suggestedIdeas.status, ["pending", "approved"]),
            notExists(alreadyLinked),
          ),
        );
    }),

  candidateIdeas: publicProcedure
    .input(z.object({ suggestionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const alreadyLinked = db
        .select({ one: sql`1` })
        .from(suggestionIdeaLinks)
        .where(
          and(
            eq(suggestionIdeaLinks.suggestionId, input.suggestionId),
            eq(suggestionIdeaLinks.ideaId, ideas.id),
          ),
        );

      return db
        .select({ id: ideas.id, enText: ideaTranslations.text })
        .from(ideas)
        .innerJoin(suggestedIdeas, eq(suggestedIdeas.ideaBankId, ideas.ideaBankId))
        .leftJoin(
          ideaTranslations,
          and(eq(ideaTranslations.ideaId, ideas.id), eq(ideaTranslations.language, "en")),
        )
        .where(
          and(
            eq(suggestedIdeas.id, input.suggestionId),
            eq(ideas.isActive, true),
            notExists(alreadyLinked),
          ),
        );
    }),
});
