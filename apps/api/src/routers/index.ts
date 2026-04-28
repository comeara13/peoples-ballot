import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { partiesRouter } from "./parties";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";
import { votersRouter } from "./voters";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  parties: partiesRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
  voters: votersRouter,
});

export type AppRouter = typeof appRouter;
