CREATE TABLE "post_assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_assessment_responses_ballot_id_question_id_unique" UNIQUE("ballot_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "idea_banks" ADD COLUMN "post_vote_message" text;--> statement-breakpoint
ALTER TABLE "post_assessment_responses" ADD CONSTRAINT "post_assessment_responses_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_assessment_responses" ADD CONSTRAINT "post_assessment_responses_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;
