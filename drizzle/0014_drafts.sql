CREATE TYPE "public"."draft_reply_type" AS ENUM('presales', 'arrival', 'instay', 'poststay');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'approved', 'edited', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"short_id" text NOT NULL,
	"reply_type" "draft_reply_type" NOT NULL,
	"proposed_body" text NOT NULL,
	"context_note" text,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"final_body" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drafts_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drafts_status_created_at_idx" ON "drafts" USING btree ("status","created_at");