CREATE TYPE "public"."conversation_status" AS ENUM('ai_active', 'human_active', 'cooloff');--> statement-breakpoint
CREATE TYPE "public"."lang_pref" AS ENUM('en', 'hinglish', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."marketing_opt_in_source" AS ENUM('website_booking', 'in_chat', 'imported');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('guest', 'ai', 'human', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('received', 'queued', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'audio', 'video', 'document', 'location', 'template', 'interactive', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."raw_event_source" AS ENUM('whatsapp', 'ezee');--> statement-breakpoint
CREATE TYPE "public"."register_pref" AS ENUM('warm_first_name', 'formal_sir_maam', 'unknown');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"status" "conversation_status" DEFAULT 'ai_active' NOT NULL,
	"human_active_until" timestamp with time zone,
	"last_guest_msg_at" timestamp with time zone,
	"service_window_expires_at" timestamp with time zone,
	"degraded_notified" boolean DEFAULT false NOT NULL,
	"summary" text,
	"summary_upto_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_guest_id_unique" UNIQUE("guest_id")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"wa_profile_name" text,
	"first_name" text,
	"last_name" text,
	"register_pref" "register_pref" DEFAULT 'unknown' NOT NULL,
	"lang_pref" "lang_pref" DEFAULT 'unknown' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_opt_in_source" "marketing_opt_in_source",
	"marketing_opt_in_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"wa_message_id" text,
	"direction" "message_direction" NOT NULL,
	"sender" "message_sender" NOT NULL,
	"type" "message_type" NOT NULL,
	"body" text,
	"media_id" text,
	"template_name" text,
	"status" "message_status" NOT NULL,
	"error" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
CREATE TABLE "raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "raw_event_source" NOT NULL,
	"event_type" text,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");