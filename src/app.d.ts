import type { Locale } from '#lib/i18n/index.ts';
import type { schema } from '#lib/server/db/index.ts';

declare global {
	namespace App {
		interface Locals {
			user: typeof schema.users.$inferSelect | null;
			locale: Locale;
		}
	}
}

export {};
