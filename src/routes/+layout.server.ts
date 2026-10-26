import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const locale = locals.locale;
	if (!locals.user) return { user: null, openReceipts: 0, contactRequests: 0, locale };
	const open = await db.$count(
		schema.receipts,
		and(
			eq(schema.receipts.ownerId, locals.user.id),
			isNull(schema.receipts.expenseId),
			eq(schema.receipts.dismissed, false)
		)
	);
	const requests = await db.$count(
		schema.contactRequests,
		eq(schema.contactRequests.toId, locals.user.id)
	);
	const { id, name, avatarUrl, email } = locals.user;
	return {
		user: { id, name, avatarUrl, email },
		openReceipts: open,
		contactRequests: requests,
		locale
	};
};
