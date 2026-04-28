import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { partiesRouter } from "./parties";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  parties: partiesRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
});

export type AppRouter = typeof appRouter;
