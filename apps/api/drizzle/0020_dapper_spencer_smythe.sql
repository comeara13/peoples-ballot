ALTER TABLE "parties" ADD COLUMN "mode" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "default_pair_count" integer;
