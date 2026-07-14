CREATE TYPE "public"."reference_attempt_outcome" AS ENUM('linked', 'refused');--> statement-breakpoint
CREATE TABLE "reference_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"claimed_reference" text NOT NULL,
	"outcome" "reference_attempt_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "reference_attempts_phone_created_idx" ON "reference_attempts" USING btree ("phone","created_at");