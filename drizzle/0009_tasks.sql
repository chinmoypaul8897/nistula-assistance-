CREATE TYPE "public"."task_kind" AS ENUM('housekeeping', 'maintenance', 'frontdesk', 'escalation', 'night_queue');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'nudged', 'done', 'cancelled', 'notify_failed');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"guest_id" uuid,
	"booking_id" uuid,
	"villa_label" text,
	"kind" "task_kind" NOT NULL,
	"short_id" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assigned_phone" text,
	"sla_minutes" integer NOT NULL,
	"sla_deadline" timestamp with time zone NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_booking_id_bookings_mirror_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings_mirror"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_status_sla_deadline_idx" ON "tasks" USING btree ("status","sla_deadline");--> statement-breakpoint
CREATE INDEX "tasks_guest_status_idx" ON "tasks" USING btree ("guest_id","status");