-- Voter registration now happens after ballot entry, not before generation.
-- voter_id is set when the voter registers via their ballot link.
ALTER TABLE "ballots" ALTER COLUMN "voter_id" DROP NOT NULL;