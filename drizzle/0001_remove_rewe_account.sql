DROP TABLE "rewe_accounts" CASCADE;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."receipt_source";--> statement-breakpoint
CREATE TYPE "public"."receipt_source" AS ENUM('ebon_mail', 'manual');--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "source" SET DATA TYPE "public"."receipt_source" USING "source"::"public"."receipt_source";