import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { partiesRouter } from "./parties";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";
import { votersRouter } from "./voters";
import { suggestedIdeasRouter } from "./suggestedIdeas";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  parties: partiesRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
  voters: votersRouter,
  suggestedIdeas: suggestedIdeasRouter,
});

export type AppRouter = typeof appRouter;
