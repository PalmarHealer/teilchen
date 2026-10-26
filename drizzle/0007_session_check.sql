ALTER TABLE "users" ALTER COLUMN "inbox_token" SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 20);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "checked_at" timestamp with time zone DEFAULT now() NOT NULL;