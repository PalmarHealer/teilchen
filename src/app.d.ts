import type { schema } from '#lib/server/db/index.ts';

declare global {
	namespace App {
		interface Locals {
			user: typeof schema.users.$inferSelect | null;
		}
	}
}

export {};
