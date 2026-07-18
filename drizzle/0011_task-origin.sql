CREATE TYPE "public"."task_origin" AS ENUM('guest', 'system');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "origin" "task_origin" DEFAULT 'guest' NOT NULL;