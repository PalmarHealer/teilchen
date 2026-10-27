import { and, arrayContains, asc, eq, isNotNull, isNull, ne, notExists } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const r = schema.receipts;
	const s = schema.receiptSwipes;
	const fields = {
		id: r.id,
		market: r.market,
		purchasedAt: r.purchasedAt,
		totalCents: r.totalCents,
		items: db.$count(
			schema.receiptItems,
			and(eq(schema.receiptItems.receiptId, r.id), eq(schema.receiptItems.kind, 'product'))
		)
	};
	const open = await db
		.select(fields)
		.from(r)
		.where(and(eq(r.ownerId, me), isNull(r.expenseId), eq(r.dismissed, false)))
		.orderBy(asc(r.purchasedAt));
	// Booked by someone else with me in it: my turn to say what was mine.
	const theirs = await db
		.select({ ...fields, payerName: schema.users.name })
		.from(r)
		.innerJoin(schema.users, eq(schema.users.id, r.ownerId))
		.where(
			and(
				ne(r.ownerId, me),
				isNotNull(r.expenseId),
				arrayContains(r.participants, [me]),
				notExists(
					db
						.select({ x: s.userId })
						.from(s)
						.where(and(eq(s.receiptId, r.id), eq(s.userId, me)))
				)
			)
		)
		.orderBy(asc(r.purchasedAt));
	return { open, theirs };
};
