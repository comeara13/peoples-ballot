import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { partiesRouter } from "./parties";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";
import { votersRouter } from "./voters";
import { suggestedIdeasRouter } from "./suggestedIdeas";
import { affiliationsRouter } from "./affiliations";
import { assessmentRouter } from "./assessment";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  parties: partiesRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
  voters: votersRouter,
  suggestedIdeas: suggestedIdeasRouter,
  affiliations: affiliationsRouter,
  assessment: assessmentRouter,
});

export type AppRouter = typeof appRouter;
