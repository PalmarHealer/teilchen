import { json } from '@sveltejs/kit';
import { searchProducts, shopRetryIn } from '#lib/server/product-images.ts';
import type { RequestHandler } from './$types';

/** "Find photo" on a swipe card: product search in the REWE shop (logged-in users only, see hooks). */
export const GET: RequestHandler = async ({ url }) => {
	const hits = await searchProducts((url.searchParams.get('q') ?? '').slice(0, 100));
	return hits ? json(hits) : json({ retryIn: shopRetryIn() }, { status: 503 });
};
