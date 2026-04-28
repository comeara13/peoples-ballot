CREATE TABLE "voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"address_street" text,
	"address_city" text,
	"address_state" text,
	"address_zip" text,
	"consented_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voters_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "voters_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voter_race_ethnicity" (
	"voter_id" uuid NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "voter_race_ethnicity_voter_id_category_pk" PRIMARY KEY("voter_id","category")
);
--> statement-breakpoint
CREATE TABLE "affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "voter_affiliations" (
	"voter_id" uuid NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voter_affiliations_voter_id_affiliation_id_pk" PRIMARY KEY("voter_id","affiliation_id")
);
--> statement-breakpoint
ALTER TABLE "voter_race_ethnicity" ADD CONSTRAINT "voter_race_ethnicity_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "voter_affiliations" ADD CONSTRAINT "voter_affiliations_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "voter_affiliations" ADD CONSTRAINT "voter_affiliations_affiliation_id_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."affiliations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ballots" ADD COLUMN "voter_id" uuid REFERENCES "voters"("id");
--> statement-breakpoint
CREATE INDEX "ballots_voter_id_idx" ON "ballots" ("voter_id");
