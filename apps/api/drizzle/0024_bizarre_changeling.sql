CREATE TABLE "ballot_demographics" (
	"ballot_id" uuid PRIMARY KEY NOT NULL,
	"birth_year" integer,
	"gender" text
);
--> statement-breakpoint
CREATE TABLE "ballot_race_ethnicity" (
	"ballot_id" uuid NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "ballot_race_ethnicity_ballot_id_category_pk" PRIMARY KEY("ballot_id","category")
);
--> statement-breakpoint
ALTER TABLE "ballot_demographics" ADD CONSTRAINT "ballot_demographics_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_race_ethnicity" ADD CONSTRAINT "ballot_race_ethnicity_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;
