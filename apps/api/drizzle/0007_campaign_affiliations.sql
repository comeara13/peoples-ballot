-- Move affiliations from platform-wide to per-campaign (idea_bank scoped).
-- Safe to truncate: only seed data exists at this stage, no real voter selections.

TRUNCATE "affiliations" CASCADE;

ALTER TABLE "affiliations" DROP CONSTRAINT "affiliations_name_unique";
ALTER TABLE "affiliations" DROP COLUMN "type";

ALTER TABLE "affiliations"
  ADD COLUMN "idea_bank_id" uuid NOT NULL
  REFERENCES "idea_banks"("id") ON DELETE CASCADE;

ALTER TABLE "affiliations"
  ADD CONSTRAINT "affiliations_idea_bank_id_name_unique"
  UNIQUE ("idea_bank_id", "name");
