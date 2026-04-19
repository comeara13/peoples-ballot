import { router } from "../trpc";
import { ideaBanksRouter } from "./ideaBanks";
import { ballotsRouter } from "./ballots";
import { votesRouter } from "./votes";

export const appRouter = router({
  ideaBanks: ideaBanksRouter,
  ballots: ballotsRouter,
  votes: votesRouter,
});

export type AppRouter = typeof appRouter;
