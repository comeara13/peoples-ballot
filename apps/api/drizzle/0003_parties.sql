CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_bank_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"end_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "parties_idea_bank_id_idx" ON "parties" ("idea_bank_id");
--> statement-breakpoint
ALTER TABLE "ballots" DROP CONSTRAINT "ballots_idea_bank_id_idea_banks_id_fk";
--> statement-breakpoint
ALTER TABLE "ballots" DROP COLUMN "idea_bank_id";
--> statement-breakpoint
ALTER TABLE "ballots" ADD COLUMN "party_id" uuid NOT NULL REFERENCES "parties"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "ballots_party_id_idx" ON "ballots" ("party_id");
