import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { isProductImage, searchTerm } from '#lib/product-image.ts';
import { db, schema } from './db';

export type ProductHit = { title: string; imageUrl: string };

// The shop rate-limits clients that aren't browsers (429 with Retry-After). Until then we don't
// ask at all, so a short pause doesn't turn into a long block.
let pausedUntil = 0;

/** Seconds until the shop may be asked again; 0 if it may be asked now. */
export const shopRetryIn = () => Math.max(0, Math.ceil((pausedUntil - Date.now()) / 1000));

/**
 * The public product search of the REWE shop (no login, no captcha). Null when the shop can't be
 * asked right now (see shopRetryIn), so callers can tell that apart from "no hits".
 */
export async function searchProducts(query: string, limit = 8): Promise<ProductHit[] | null> {
	const term = searchTerm(query);
	if (!term) return [];
	if (shopRetryIn()) return null;
	try {
		const res = await fetch(
			`https://www.rewe.de/shop/api/products?objectsPerPage=${limit}&search=${encodeURIComponent(term)}`,
			{
				headers: { accept: 'application/vnd.rewe.digital.products+json;client=web;version=2' },
				signal: AbortSignal.timeout(5000)
			}
		);
		if (res.status === 429) {
			const wait = Number(res.headers.get('retry-after'));
			pausedUntil = Date.now() + (wait > 0 ? wait : 60) * 1000;
		}
		if (!res.ok) return null;
		const body = (await res.json()) as { hits?: { title?: unknown; imageURL?: unknown }[] };
		return (body.hits ?? []).flatMap((h) =>
			typeof h.title === 'string' && typeof h.imageURL === 'string' && isProductImage(h.imageURL)
				? [{ title: h.title, imageUrl: h.imageURL }]
				: []
		);
	} catch {
		return null;
	}
}

/**
 * An admin's name belongs to the product, not to one way of abbreviating it: "BIO MANGO LASSI" and
 * "REWE Bio Mango Lassi 250g" are the same photo, so they get the same name.
 */
async function labelOf(imageUrl: string) {
	const [row] = await db
		.select({ label: schema.productLinks.label })
		.from(schema.productLinks)
		.where(and(eq(schema.productLinks.imageUrl, imageUrl), isNotNull(schema.productLinks.label)))
		.limit(1);
	return row?.label ?? null;
}

/** Links a line to a shop product, taking over the product's name if an admin gave it one. */
export async function linkProduct(
	name: string,
	hit: ProductHit,
	by: { source: 'system' } | { source: 'user'; userId: string }
) {
	const label = await labelOf(hit.imageUrl);
	const set = {
		...hit,
		source: by.source,
		linkedBy: by.source === 'user' ? by.userId : null,
		linkedAt: new Date(),
		...(label && { label })
	};
	await db
		.insert(schema.productLinks)
		.values({ name, ...set })
		.onConflictDoUpdate({
			target: schema.productLinks.name,
			set,
			// The worker never overrides what someone picked in the meantime
			setWhere: by.source === 'system' ? isNull(schema.productLinks.source) : undefined
		});
}

/** An admin's name for a line, and for every other line linked to the same product. */
export async function renameProduct(name: string, label: string | null, userId: string) {
	await db.transaction(async (tx) => {
		const set = { label, linkedBy: userId, linkedAt: new Date() };
		const [row] = await tx
			.insert(schema.productLinks)
			.values({ name, ...set })
			.onConflictDoUpdate({ target: schema.productLinks.name, set })
			.returning({ imageUrl: schema.productLinks.imageUrl });
		if (row?.imageUrl)
			await tx
				.update(schema.productLinks)
				.set({ label })
				.where(eq(schema.productLinks.imageUrl, row.imageUrl));
	});
}

const PAUSE = 1500;
const BATCH = 30;
/** The shop's range changes; a name it didn't know is asked again after this. */
const MISS_RETRY = 30 * 86_400_000;

/**
 * Worker job: links product lines nobody has linked yet to the first shop hit for their name, one
 * at a time with a pause. Stops when the shop says no; the next run carries on.
 */
export async function linkPendingProducts() {
	const pending = await db
		.selectDistinct({ name: schema.receiptItems.name })
		.from(schema.receiptItems)
		.leftJoin(schema.productLinks, eq(schema.productLinks.name, schema.receiptItems.name))
		.leftJoin(schema.productMisses, eq(schema.productMisses.name, schema.receiptItems.name))
		.where(
			and(
				eq(schema.receiptItems.kind, 'product'),
				// No shop product yet (an admin's label alone doesn't count)
				isNull(schema.productLinks.source),
				or(
					isNull(schema.productMisses.name),
					lt(schema.productMisses.searchedAt, new Date(Date.now() - MISS_RETRY))
				)
			)
		)
		.limit(BATCH);

	for (const { name } of pending) {
		const hits = await searchProducts(name, 1);
		if (!hits) return;
		if (hits[0]) await linkProduct(name, hits[0], { source: 'system' });
		else
			await db
				.insert(schema.productMisses)
				.values({ name })
				.onConflictDoUpdate({ target: schema.productMisses.name, set: { searchedAt: new Date() } });
		await new Promise((r) => setTimeout(r, PAUSE));
	}
}
