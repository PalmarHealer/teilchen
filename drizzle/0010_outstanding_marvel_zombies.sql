CREATE TABLE "mail_addresses" (
	"address" text NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_addresses_address_user_id_pk" PRIMARY KEY("address","user_id"),
	CONSTRAINT "mail_addresses_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "product_reports" (
	"name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_reports_name_user_id_pk" PRIMARY KEY("name","user_id")
);
--> statement-breakpoint
ALTER TABLE "mail_addresses" ADD CONSTRAINT "mail_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_addresses_confirmed" ON "mail_addresses" USING btree ("address") WHERE "mail_addresses"."confirmed_at" is not null;--> statement-breakpoint
CREATE INDEX "mail_addresses_user" ON "mail_addresses" USING btree ("user_id");