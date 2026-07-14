CREATE TYPE "public"."scheduled_message_kind" AS ENUM('confirmation', 'prearrival', 'welcome', 'poststay', 'winback', 'lead_followup');--> statement-breakpoint
CREATE TYPE "public"."scheduled_message_status" AS ENUM('pending', 'sent', 'skipped', 'cancelled', 'failed');--> statement-breakpoint
CREATE TABLE "phone_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"last_inbound_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phone_windows_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"booking_id" uuid,
	"kind" "scheduled_message_kind" NOT NULL,
	"template_name" text NOT NULL,
	"params" jsonb NOT NULL,
	"send_at" timestamp with time zone NOT NULL,
	"status" "scheduled_message_status" DEFAULT 'pending' NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_message_id" uuid,
	"skip_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_messages_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_booking_id_bookings_mirror_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings_mirror"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_messages_status_send_at_idx" ON "scheduled_messages" USING btree ("status","send_at");