import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  unique,
  check,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ideaBanks = pgTable("idea_banks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ideas = pgTable("ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  ideaBankId: uuid("idea_bank_id")
    .references(() => ideaBanks.id, { onDelete: "cascade" })
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// All idea text lives here — no text column on `ideas` itself.
export const ideaTranslations = pgTable(
  "idea_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .references(() => ideas.id, { onDelete: "cascade" })
      .notNull(),
    language: text("language").notNull(),
    text: text("text").notNull(),
  },
  (t) => [unique().on(t.ideaId, t.language)],
);

// Persistent pair identity across all ballots. Canonical ordering: left_idea_id < right_idea_id
// (UUID lexicographic). votes_count drives the catchup sampling weight.
// Presentation order (which idea appears left vs right) is decided per ballot_pair, not here.
export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaBankId: uuid("idea_bank_id")
      .references(() => ideaBanks.id, { onDelete: "cascade" })
      .notNull(),
    leftIdeaId: uuid("left_idea_id")
      .references(() => ideas.id)
      .notNull(),
    rightIdeaId: uuid("right_idea_id")
      .references(() => ideas.id)
      .notNull(),
    votesCount: integer("votes_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.ideaBankId, t.leftIdeaId, t.rightIdeaId),
    check("prompts_canonical_order", sql`${t.leftIdeaId} < ${t.rightIdeaId}`),
  ],
);

// A party is a distinct voting event (e.g. "April Town Hall") within an idea bank.
// Each party groups 1-N ballots from the same event. Catchup weights are bank-wide across parties.
export const parties = pgTable(
  "parties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaBankId: uuid("idea_bank_id")
      .references(() => ideaBanks.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    status: text("status", { enum: ["active", "closed"] })
      .default("active")
      .notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).defaultNow().notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("parties_idea_bank_id_idx").on(t.ideaBankId)],
);

// OMB Statistical Policy Directive 15 (SPD-15, updated March 2024) race/ethnicity categories.
// Multi-select: a person may select more than one. "prefer_not_to_say" is mutually exclusive.
export const RACE_ETHNICITY_CATEGORIES = [
  "white",
  "black_african_american",
  "american_indian_alaska_native",
  "asian",
  "native_hawaiian_pacific_islander",
  "middle_eastern_north_african",
  "prefer_not_to_say",
] as const;

export type RaceEthnicityCategory = (typeof RACE_ETHNICITY_CATEGORIES)[number];

// Global voter identity. Deduped by email until Clerk auth lands.
export const voters = pgTable("voters", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  // Address fields normalized by Google Places Autocomplete on the frontend.
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressState: text("address_state"), // 2-char USPS code
  addressZip: text("address_zip"),
  // CCPA/GDPR: record when the voter consented to data collection.
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Multi-select race/ethnicity per OMB SPD-15 2024. One row per selected category per voter.
export const voterRaceEthnicity = pgTable(
  "voter_race_ethnicity",
  {
    voterId: uuid("voter_id")
      .references(() => voters.id, { onDelete: "cascade" })
      .notNull(),
    category: text("category", { enum: RACE_ETHNICITY_CATEGORIES }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.voterId, t.category] })],
);

// Per-campaign affiliation groups (e.g. "Working Families Party", "Neighbors United").
// Admins create these per idea bank; the voter intake form shows only the bank's groups.
export const affiliations = pgTable(
  "affiliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaBankId: uuid("idea_bank_id")
      .references(() => ideaBanks.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("affiliations_idea_bank_id_name_unique").on(t.ideaBankId, t.name)],
);

// Many-to-many: a voter may belong to multiple affiliation groups.
export const voterAffiliations = pgTable(
  "voter_affiliations",
  {
    voterId: uuid("voter_id")
      .references(() => voters.id, { onDelete: "cascade" })
      .notNull(),
    affiliationId: uuid("affiliation_id")
      .references(() => affiliations.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.voterId, t.affiliationId] })],
);

export const ballots = pgTable(
  "ballots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partyId: uuid("party_id")
      .references(() => parties.id, { onDelete: "cascade" })
      .notNull(),
    voterId: uuid("voter_id").references(() => voters.id),
    status: text("status", { enum: ["pending", "in_progress", "submitted"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("ballots_party_id_idx").on(t.partyId), index("ballots_voter_id_idx").on(t.voterId)],
);

// A ballot_pair is one instance of a prompt being shown in a specific ballot at a specific position.
// left_idea_id/right_idea_id are denormalized from the prompt with a possible flip for presentation
// variety — they record what the voter actually saw, not the canonical prompt order.
export const ballotPairs = pgTable(
  "ballot_pairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ballotId: uuid("ballot_id")
      .references(() => ballots.id, { onDelete: "cascade" })
      .notNull(),
    promptId: uuid("prompt_id")
      .references(() => prompts.id)
      .notNull(),
    position: integer("position").notNull(),
    leftIdeaId: uuid("left_idea_id")
      .references(() => ideas.id, { onDelete: "cascade" })
      .notNull(),
    rightIdeaId: uuid("right_idea_id")
      .references(() => ideas.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    index("ballot_pairs_left_idea_id_idx").on(t.leftIdeaId),
    index("ballot_pairs_right_idea_id_idx").on(t.rightIdeaId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ballotPairId: uuid("ballot_pair_id")
      .references(() => ballotPairs.id, { onDelete: "cascade" })
      .notNull(),
    selection: text("selection", {
      enum: ["left", "right", "cant_decide"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("votes_ballot_pair_id_idx").on(t.ballotPairId)],
);

// Voter-submitted idea suggestions, pending human review before entering the answer bank.
export const suggestedIdeas = pgTable("suggested_ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Nullable: suggestions survive ballot/voter deletion.
  ballotId: uuid("ballot_id").references(() => ballots.id, { onDelete: "set null" }),
  // Denormalized from ballot → party; nullable so suggestions survive party deletion.
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "set null" }),
  ideaBankId: uuid("idea_bank_id")
    .references(() => ideaBanks.id, { onDelete: "cascade" })
    .notNull(),
  voterId: uuid("voter_id").references(() => voters.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  testimonial: text("testimonial"),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "merged"],
  })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Platform-wide controlled vocabulary of tags. Typed (issue_category | scale).
// Tags are archived rather than deleted — archived tags remain on existing items
// but are excluded from pickers for new tagging.
export const TAG_TYPES = ["issue_category", "scale"] as const;
export type TagType = (typeof TAG_TYPES)[number];

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type", { enum: TAG_TYPES }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("tags_name_type_unique").on(t.name, t.type)],
);

// Many-to-many: ideas ↔ tags. No cascade on tag deletion (tags are only archived).
export const ideaTags = pgTable(
  "idea_tags",
  {
    ideaId: uuid("idea_id")
      .references(() => ideas.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.tagId] })],
);

// Many-to-many: suggestions ↔ tags. No cascade on tag deletion (tags are only archived).
export const suggestionTags = pgTable(
  "suggestion_tags",
  {
    suggestionId: uuid("suggestion_id")
      .references(() => suggestedIdeas.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.suggestionId, t.tagId] })],
);

// Pre-assessment questions configured per idea bank. Shown at the bottom of the voter
// registration form; voters answer before accessing the ballot pairs.
export const assessmentQuestions = pgTable("assessment_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ideaBankId: uuid("idea_bank_id")
    .references(() => ideaBanks.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  type: text("type", { enum: ["likert", "yes_no"] }).notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// One response row per question per ballot. Stored at registration time alongside
// voter demographics — same transaction, same submit button.
export const assessmentResponses = pgTable(
  "assessment_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ballotId: uuid("ballot_id")
      .references(() => ballots.id, { onDelete: "cascade" })
      .notNull(),
    questionId: uuid("question_id")
      .references(() => assessmentQuestions.id, { onDelete: "cascade" })
      .notNull(),
    // "1"–"5" for likert, "yes"/"no" for yes_no
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.ballotId, t.questionId)],
);
