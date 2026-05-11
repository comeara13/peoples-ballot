CREATE TABLE "suggestion_idea_links" (
	"suggestion_id" uuid NOT NULL,
	"idea_id" uuid NOT NULL,
	CONSTRAINT "suggestion_idea_links_suggestion_id_idea_id_pk" PRIMARY KEY("suggestion_id","idea_id")
);
--> statement-breakpoint
ALTER TABLE "suggestion_idea_links" ADD CONSTRAINT "suggestion_idea_links_suggestion_id_suggested_ideas_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."suggested_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion_idea_links" ADD CONSTRAINT "suggestion_idea_links_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;