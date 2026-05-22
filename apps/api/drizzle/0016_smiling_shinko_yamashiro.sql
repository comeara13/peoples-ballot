CREATE TABLE "glossary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "glossary_terms_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "idea_glossary_terms" (
	"idea_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	CONSTRAINT "idea_glossary_terms_idea_id_term_id_pk" PRIMARY KEY("idea_id","term_id")
);
--> statement-breakpoint
ALTER TABLE "idea_glossary_terms" ADD CONSTRAINT "idea_glossary_terms_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_glossary_terms" ADD CONSTRAINT "idea_glossary_terms_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE no action ON UPDATE no action;