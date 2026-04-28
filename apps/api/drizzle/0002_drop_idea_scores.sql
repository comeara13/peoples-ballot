ALTER TABLE "ideas" DROP COLUMN "wins";--> statement-breakpoint
ALTER TABLE "ideas" DROP COLUMN "losses";--> statement-breakpoint
ALTER TABLE "ideas" DROP COLUMN "score";--> statement-breakpoint
CREATE INDEX "ballot_pairs_left_idea_id_idx" ON "ballot_pairs" ("left_idea_id");--> statement-breakpoint
CREATE INDEX "ballot_pairs_right_idea_id_idx" ON "ballot_pairs" ("right_idea_id");--> statement-breakpoint
CREATE INDEX "votes_ballot_pair_id_idx" ON "votes" ("ballot_pair_id");
