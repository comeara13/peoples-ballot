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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ideaBanks = pgTable("idea_banks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const ideas = pgTable("ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  ideaBankId: uuid("idea_bank_id")
    .references(() => ideaBanks.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique().on(t.ideaBankId, t.leftIdeaId, t.rightIdeaId),
    check("prompts_canonical_order", sql`${t.leftIdeaId} < ${t.rightIdeaId}`),
  ],
);

export const ballots = pgTable("ballots", {
  id: uuid("id").defaultRandom().primaryKey(),
  ideaBankId: uuid("idea_bank_id")
    .references(() => ideaBanks.id)
    .notNull(),
  status: text("status", { enum: ["pending", "in_progress", "submitted"] })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

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
      .references(() => ideas.id)
      .notNull(),
    rightIdeaId: uuid("right_idea_id")
      .references(() => ideas.id)
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("votes_ballot_pair_id_idx").on(t.ballotPairId)],
);
