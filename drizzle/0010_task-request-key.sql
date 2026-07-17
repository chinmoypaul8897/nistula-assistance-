ALTER TABLE "tasks" ADD COLUMN "request_key" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_request_key_unique" UNIQUE("request_key");