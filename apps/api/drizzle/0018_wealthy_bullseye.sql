ALTER TABLE "idea_banks" ADD COLUMN "question_heading" text;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "question_heading" text;--> statement-breakpoint
UPDATE "idea_banks" SET "question_heading" = 'Which idea would best help build a community that works for all of us?';