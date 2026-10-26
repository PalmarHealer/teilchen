CREATE TABLE "contact_requests" (
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_requests_from_id_to_id_pk" PRIMARY KEY("from_id","to_id")
);
--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_from_id_users_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_to_id_users_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_requests_to" ON "contact_requests" USING btree ("to_id");--> statement-breakpoint
-- Contacts become explicit: everyone who already shares a group stays a contact.
INSERT INTO "connections" ("user_a", "user_b")
SELECT DISTINCT a."user_id", b."user_id"
FROM "group_members" a
JOIN "group_members" b ON a."group_id" = b."group_id" AND a."user_id" < b."user_id"
ON CONFLICT DO NOTHING;
