ALTER TABLE "receipt_items" ADD COLUMN "kind" text DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD COLUMN "discountable" boolean DEFAULT true NOT NULL;