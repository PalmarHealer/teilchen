import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null, openReceipts: 0 };
	const open = await db.$count(
		schema.receipts,
		and(
			eq(schema.receipts.ownerId, locals.user.id),
			isNull(schema.receipts.expenseId),
			eq(schema.receipts.dismissed, false)
		)
	);
	const { id, name, avatarUrl, email } = locals.user;
	return { user: { id, name, avatarUrl, email }, openReceipts: open };
};
