import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const r = schema.receipts;
	const open = await db
		.select({
			id: r.id,
			market: r.market,
			purchasedAt: r.purchasedAt,
			totalCents: r.totalCents,
			source: r.source,
			items: db.$count(schema.receiptItems, eq(schema.receiptItems.receiptId, r.id))
		})
		.from(r)
		.where(and(eq(r.ownerId, locals.user!.id), isNull(r.expenseId), eq(r.dismissed, false)))
		.orderBy(asc(r.purchasedAt));
	return { open };
};
