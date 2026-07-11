CREATE TYPE "public"."cost_event_kind" AS ENUM('anthropic_input', 'anthropic_output', 'anthropic_cache_read', 'anthropic_cache_write', 'wa_template');--> statement-breakpoint
CREATE TABLE "cost_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"kind" "cost_event_kind" NOT NULL,
	"quantity" numeric NOT NULL,
	"inr_estimate" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
