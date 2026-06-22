CREATE INDEX "testimonials_ballot_id_idx" ON "testimonials" USING btree ("ballot_id");--> statement-breakpoint
CREATE INDEX "testimonials_suggestion_id_idx" ON "testimonials" USING btree ("suggestion_id");--> statement-breakpoint
ALTER TABLE "suggested_ideas" DROP COLUMN "testimonial";
