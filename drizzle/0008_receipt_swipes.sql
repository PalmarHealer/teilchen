CREATE TABLE "receipt_swipes" (
	"receipt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"decisions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_swipes_receipt_id_user_id_pk" PRIMARY KEY("receipt_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "receipt_items" ADD COLUMN "owners" uuid[];--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "participants" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_swipes" ADD CONSTRAINT "receipt_swipes_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_swipes" ADD CONSTRAINT "receipt_swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_swipes_user" ON "receipt_swipes" USING btree ("user_id");--> statement-breakpoint
-- "All mine" and skipped receipts used to be hidden. They become expenses of their owner alone,
-- so they show up under expenses and can be swiped again or deleted.
WITH solo AS (
	SELECT id AS receipt_id, owner_id, total_cents, purchased_at, gen_random_uuid() AS expense_id
	FROM receipts WHERE dismissed AND expense_id IS NULL
), booked AS (
	INSERT INTO expenses (id, payer_id, created_by, title, amount_cents, spent_at)
	SELECT expense_id, owner_id, owner_id,
		'Einkauf ' || to_char(purchased_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY'),
		total_cents, purchased_at
	FROM solo
), shared AS (
	INSERT INTO expense_shares (expense_id, user_id, cents)
	SELECT expense_id, owner_id, total_cents FROM solo WHERE total_cents <> 0
)
UPDATE receipts r
SET expense_id = solo.expense_id, participants = ARRAY[solo.owner_id], dismissed = false
FROM solo WHERE r.id = solo.receipt_id;
