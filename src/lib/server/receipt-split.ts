import { asc, eq } from 'drizzle-orm';
import { resolveReceipt, type ItemDecision } from '#lib/split.ts';
import { db, schema } from './db';
import { replaceShares, type Db } from './domain.ts';

const { receipts, receiptItems, receiptSwipes, expenses } = schema;

/**
 * A receipt with everyone's swipes combined (see resolveReceipt). Receipts booked before
 * participants were recorded have none and keep the shares they were booked with.
 */
export async function receiptSplit(receiptId: string, tx: Db = db) {
	const [receipt] = await tx.select().from(receipts).where(eq(receipts.id, receiptId));
	if (!receipt) return null;
	const lines = await tx
		.select()
		.from(receiptItems)
		.where(eq(receiptItems.receiptId, receiptId))
		.orderBy(asc(receiptItems.position));
	const swipes = await tx
		.select()
		.from(receiptSwipes)
		.where(eq(receiptSwipes.receiptId, receiptId));
	const everyone = receipt.participants.length ? receipt.participants : [receipt.ownerId];
	const swiped = new Map(swipes.map((s) => [s.userId, s.decisions]));
	return {
		receipt,
		everyone,
		swiped,
		...resolveReceipt(receipt.ownerId, everyone, lines, swiped)
	};
}

/** Books the combined swipes into the receipt's expense. */
export async function rebookReceipt(receiptId: string, tx: Db = db) {
	const split = await receiptSplit(receiptId, tx);
	if (!split?.receipt.expenseId || !split.receipt.participants.length) return;
	await replaceShares(tx, split.receipt.expenseId, split.shares);
}

/** Stores (or replaces) one person's swipe of a receipt. */
export async function saveSwipe(
	tx: Db,
	receiptId: string,
	userId: string,
	decisions: Record<string, ItemDecision>
) {
	await tx
		.insert(receiptSwipes)
		.values({ receiptId, userId, decisions })
		.onConflictDoUpdate({
			target: [receiptSwipes.receiptId, receiptSwipes.userId],
			set: { decisions, swipedAt: new Date() }
		});
}

/** Drops the booking and all swipes: the receipt goes back to its owner's swipe queue. */
export async function resetReceipt(receiptId: string) {
	await db.transaction(async (tx) => {
		const [receipt] = await tx
			.select({ expenseId: receipts.expenseId })
			.from(receipts)
			.where(eq(receipts.id, receiptId));
		await tx.delete(receiptSwipes).where(eq(receiptSwipes.receiptId, receiptId));
		await tx
			.update(receiptItems)
			.set({ owners: null, decision: null })
			.where(eq(receiptItems.receiptId, receiptId));
		await tx
			.update(receipts)
			.set({ expenseId: null, participants: [], dismissed: false })
			.where(eq(receipts.id, receiptId));
		if (receipt?.expenseId) await tx.delete(expenses).where(eq(expenses.id, receipt.expenseId));
	});
}
