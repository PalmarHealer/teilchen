CREATE TABLE "product_links" (
	"name" text PRIMARY KEY NOT NULL,
	"title" text,
	"image_url" text,
	"source" text,
	"label" text,
	"linked_by" uuid,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_misses" (
	"name" text PRIMARY KEY NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "edit_links" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;