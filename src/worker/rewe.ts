import { and, eq, inArray } from 'drizzle-orm';
import { decrypt, encrypt } from '#lib/server/crypto.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { parseEbonPdf } from '#lib/server/ebon/pdf.ts';
import { importEbon } from '#lib/server/receipts.ts';
import {
	reweEbonPdf,
	reweFreshTokens,
	reweListEbons,
	type ReweTokens
} from '#lib/server/rewe/client.ts';

export async function syncReweAccounts() {
	const accounts = await db
		.select()
		.from(schema.reweAccounts)
		.where(eq(schema.reweAccounts.enabled, true));
	for (const acc of accounts) {
		try {
			const tokens = await reweFreshTokens(JSON.parse(decrypt(acc.tokensEnc)) as ReweTokens);
			await db
				.update(schema.reweAccounts)
				.set({ tokensEnc: encrypt(JSON.stringify(tokens)) })
				.where(eq(schema.reweAccounts.userId, acc.userId));
			await syncOne(acc.userId, tokens.accessToken);
			await db
				.update(schema.reweAccounts)
				.set({ lastSyncAt: new Date(), lastError: null })
				.where(eq(schema.reweAccounts.userId, acc.userId));
		} catch (e) {
			await db
				.update(schema.reweAccounts)
				.set({ lastError: e instanceof Error ? e.message : String(e) })
				.where(eq(schema.reweAccounts.userId, acc.userId));
		}
	}
}

async function syncOne(userId: string, accessToken: string) {
	const list = (await reweListEbons(accessToken)).filter((e) => !e.cancelled);
	if (!list.length) return;
	const ids = list.map((e) => `rewe:${e.receiptId}`);
	const known = new Set(
		(
			await db
				.select({ id: schema.receipts.externalId })
				.from(schema.receipts)
				.where(and(eq(schema.receipts.ownerId, userId), inArray(schema.receipts.externalId, ids)))
		).map((r) => r.id)
	);
	for (const e of list) {
		if (known.has(`rewe:${e.receiptId}`)) continue;
		const bon = await parseEbonPdf(await reweEbonPdf(accessToken, e.receiptId));
		if (!bon) continue;
		const market = [e.market?.name, e.market?.street, e.market?.city].filter(Boolean).join(', ');
		await importEbon(userId, 'rewe_api', `rewe:${e.receiptId}`, bon, market || null);
	}
}
