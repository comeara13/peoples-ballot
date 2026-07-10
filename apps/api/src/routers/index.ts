import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { partiesRouter } from "./parties";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";
import { votersRouter } from "./voters";
import { suggestedIdeasRouter } from "./suggestedIdeas";
import { affiliationsRouter } from "./affiliations";
import { assessmentRouter } from "./assessment";
import { tagsRouter } from "./tags";
import { suggestionLinksRouter } from "./suggestionLinks";
import { glossaryRouter } from "./glossary";
import { testimonialsRouter } from "./testimonials";
import { analyticsRouter } from "./analytics";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  analytics: analyticsRouter,
  parties: partiesRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
  voters: votersRouter,
  suggestedIdeas: suggestedIdeasRouter,
  affiliations: affiliationsRouter,
  assessment: assessmentRouter,
  tags: tagsRouter,
  suggestionLinks: suggestionLinksRouter,
  glossary: glossaryRouter,
  testimonials: testimonialsRouter,
});

export type AppRouter = typeof appRouter;
