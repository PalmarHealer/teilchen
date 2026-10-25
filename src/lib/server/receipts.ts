import { db, schema } from './db';
import type { Ebon } from './ebon/parse';

/** Stores a parsed receipt with its items. Returns false if it already exists. */
export async function importEbon(
	ownerId: string,
	source: 'rewe_api' | 'ebon_mail',
	externalId: string,
	bon: Ebon,
	market?: string | null
): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [receipt] = await tx
			.insert(schema.receipts)
			.values({
				ownerId,
				source,
				externalId,
				market: market ?? bon.market,
				purchasedAt: bon.purchasedAt,
				totalCents: bon.totalCents,
				raw: { bonNr: bon.bonNr, mismatch: bon.mismatch }
			})
			.onConflictDoNothing()
			.returning({ id: schema.receipts.id });
		if (!receipt) return false;
		if (bon.items.length) {
			await tx.insert(schema.receiptItems).values(
				bon.items.map((it, position) => ({
					receiptId: receipt.id,
					position,
					name: it.name,
					quantity: String(it.quantity),
					unit: it.unit,
					totalCents: it.totalCents
				}))
			);
		}
		return true;
	});
}
