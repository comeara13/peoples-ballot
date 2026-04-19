CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_bank_id" uuid NOT NULL,
	"left_idea_id" uuid NOT NULL,
	"right_idea_id" uuid NOT NULL,
	"votes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompts_idea_bank_id_left_idea_id_right_idea_id_unique" UNIQUE("idea_bank_id","left_idea_id","right_idea_id"),
	CONSTRAINT "prompts_canonical_order" CHECK ("prompts"."left_idea_id" < "prompts"."right_idea_id")
);
--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD COLUMN "prompt_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "wins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "losses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score" double precision DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_idea_bank_id_idea_banks_id_fk" FOREIGN KEY ("idea_bank_id") REFERENCES "public"."idea_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_left_idea_id_ideas_id_fk" FOREIGN KEY ("left_idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_right_idea_id_ideas_id_fk" FOREIGN KEY ("right_idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballot_pairs" ADD CONSTRAINT "ballot_pairs_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE no action ON UPDATE no action;