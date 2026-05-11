CREATE TYPE "public"."tag_type" AS ENUM('issue_category', 'scale');--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "type" SET DATA TYPE "public"."tag_type" USING "type"::"public"."tag_type";