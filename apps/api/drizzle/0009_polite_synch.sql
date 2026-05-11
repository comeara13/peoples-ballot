ALTER TABLE "ballot_pairs" DROP CONSTRAINT "ballot_pairs_left_idea_id_ideas_id_fk";
--> statement-breakpoint
ALTER TABLE "ballot_pairs" DROP CONSTRAINT "ballot_pairs_right_idea_id_ideas_id_fk";
--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_left_idea_id_ideas_id_fk" FOREIGN KEY ("left_idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_right_idea_id_ideas_id_fk" FOREIGN KEY ("right_idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;