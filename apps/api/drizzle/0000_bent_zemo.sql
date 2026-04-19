CREATE TABLE "ballot_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"left_idea_id" uuid NOT NULL,
	"right_idea_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_bank_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idea_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"language" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "idea_translations_idea_id_language_unique" UNIQUE("idea_id","language")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_bank_id" uuid NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_pair_id" uuid NOT NULL,
	"selection" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_left_idea_id_ideas_id_fk" FOREIGN KEY ("left_idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_right_idea_id_ideas_id_fk" FOREIGN KEY ("right_idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_translations" ADD CONSTRAINT "idea_translations_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_ballot_pair_id_ballot_pairs_id_fk" FOREIGN KEY ("ballot_pair_id") REFERENCES "public"."ballot_pairs"("id") ON DELETE cascade ON UPDATE no action;