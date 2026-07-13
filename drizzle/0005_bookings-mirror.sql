CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'modified', 'cancelled', 'no_show', 'checked_in', 'checked_out', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."guest_stay_matched_by" AS ENUM('phone', 'reference_in_chat', 'manual');--> statement-breakpoint
CREATE TABLE "bookings_mirror" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ezee_reservation_no" text NOT NULL,
	"ezee_booking_tran_id" text,
	"guest_name" text,
	"guest_phone" text,
	"guest_email" text,
	"room_type_id" text,
	"room_type_name" text,
	"physical_room_label" text,
	"rateplan_id" text,
	"check_in" date,
	"check_out" date,
	"adults" integer,
	"children" integer,
	"status" "booking_status" NOT NULL,
	"source" text,
	"amount" numeric,
	"currency" text,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_mirror_ezee_reservation_no_unique" UNIQUE("ezee_reservation_no")
);
--> statement-breakpoint
CREATE TABLE "guest_stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"matched_by" "guest_stay_matched_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_stays_guest_booking_unique" UNIQUE("guest_id","booking_id")
);
--> statement-breakpoint
ALTER TABLE "guest_stays" ADD CONSTRAINT "guest_stays_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_stays" ADD CONSTRAINT "guest_stays_booking_id_bookings_mirror_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings_mirror"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_mirror_guest_phone_idx" ON "bookings_mirror" USING btree ("guest_phone");--> statement-breakpoint
CREATE INDEX "bookings_mirror_check_in_idx" ON "bookings_mirror" USING btree ("check_in");