ALTER TABLE "receipt_items" ADD COLUMN "deposit_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "deposit_split" text DEFAULT 'item' NOT NULL;--> statement-breakpoint
-- Deposit lines and bottle returns imported before deposit_cents existed are all deposit
UPDATE "receipt_items" SET "deposit_cents" = "total_cents" WHERE "kind" = 'product' AND "name" ~* '^(PFAND|EINWEG|MEHRWEG|LEERG)';
