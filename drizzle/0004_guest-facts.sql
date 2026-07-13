CREATE TYPE "public"."guest_fact_kind" AS ENUM('preference', 'past_issue', 'context', 'celebration');--> statement-breakpoint
CREATE TABLE "guest_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"kind" "guest_fact_kind" NOT NULL,
	"content" text NOT NULL,
	"source_message_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_facts" ADD CONSTRAINT "guest_facts_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_facts_guest_created_idx" ON "guest_facts" USING btree ("guest_id","created_at");