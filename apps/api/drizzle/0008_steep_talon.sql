CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_bank_id" uuid NOT NULL,
	"text" text NOT NULL,
	"type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_responses_ballot_id_question_id_unique" UNIQUE("ballot_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "affiliations" DROP CONSTRAINT "affiliations_idea_bank_id_name_unique";--> statement-breakpoint
ALTER TABLE "prompts" DROP CONSTRAINT "prompts_canonical_order";--> statement-breakpoint
ALTER TABLE "affiliations" DROP CONSTRAINT "affiliations_idea_bank_id_fkey";
--> statement-breakpoint
ALTER TABLE "ballots" DROP CONSTRAINT "ballots_party_id_fkey";
--> statement-breakpoint
ALTER TABLE "ballots" DROP CONSTRAINT "ballots_voter_id_fkey";
--> statement-breakpoint
DROP INDEX "votes_ballot_pair_id_idx";--> statement-breakpoint
DROP INDEX "ballot_pairs_left_idea_id_idx";--> statement-breakpoint
DROP INDEX "ballot_pairs_right_idea_id_idx";--> statement-breakpoint
DROP INDEX "parties_idea_bank_id_idx";--> statement-breakpoint
DROP INDEX "ballots_party_id_idx";--> statement-breakpoint
DROP INDEX "ballots_voter_id_idx";--> statement-breakpoint
ALTER TABLE "suggested_ideas" ALTER COLUMN "government_levels" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "votes_ballot_pair_id_idx" ON "votes" USING btree ("ballot_pair_id");--> statement-breakpoint
CREATE INDEX "ballot_pairs_left_idea_id_idx" ON "ballot_pairs" USING btree ("left_idea_id");--> statement-breakpoint
CREATE INDEX "ballot_pairs_right_idea_id_idx" ON "ballot_pairs" USING btree ("right_idea_id");--> statement-breakpoint
CREATE INDEX "parties_idea_bank_id_idx" ON "parties" USING btree ("idea_bank_id");--> statement-breakpoint
CREATE INDEX "ballots_party_id_idx" ON "ballots" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "ballots_voter_id_idx" ON "ballots" USING btree ("voter_id");--> statement-breakpoint
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_idea_bank_id_name_unique" UNIQUE("idea_bank_id","name");--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_canonical_order" CHECK ("prompts"."left_idea_id" < "prompts"."right_idea_id");