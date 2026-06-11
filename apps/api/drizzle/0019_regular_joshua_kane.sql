ALTER TABLE "ballots" ADD COLUMN "access_code" text;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_access_code_unique" UNIQUE("access_code");