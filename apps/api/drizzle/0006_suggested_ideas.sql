CREATE TABLE "suggested_ideas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ballot_id" uuid,
  "party_id" uuid,
  "idea_bank_id" uuid NOT NULL,
  "voter_id" uuid,
  "text" text NOT NULL,
  "government_levels" text[] DEFAULT '{}' NOT NULL,
  "testimonial" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suggested_ideas" ADD CONSTRAINT "suggested_ideas_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "suggested_ideas" ADD CONSTRAINT "suggested_ideas_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "suggested_ideas" ADD CONSTRAINT "suggested_ideas_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "suggested_ideas" ADD CONSTRAINT "suggested_ideas_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE set null ON UPDATE no action;
