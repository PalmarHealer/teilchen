/**
 * The service worker keeps visited pages and their data for offline use. They are personal
 * (balances, names), so they live in their own cache that is emptied once nobody is logged in.
 */
export const PAGE_CACHE_PREFIX = 'teilchen-pages-';

export async function clearPageCaches() {
	if (!('caches' in globalThis)) return;
	const keys = await caches.keys();
	await Promise.all(
		keys.filter((k) => k.startsWith(PAGE_CACHE_PREFIX)).map((k) => caches.delete(k))
	);
}
