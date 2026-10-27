/**
 * Product photos come from REWE's image CDN. Only links there are stored, so a saved URL can't
 * point anywhere else (tracking pixels and the like).
 */
const ORIGIN = 'https://img.rewe-static.de/';

export const isProductImage = (url: string) =>
	url.startsWith(ORIGIN) && !url.includes('?') && !url.includes('..');

/** The CDN scales on its own; the original PNG is often over a megabyte. */
export const productThumb = (url: string, width: number) =>
	`${url}?imwidth=${width}&impolicy=search`;

/**
 * eBon line name or pasted shop link → search term. A link ends in the product id
 * (rewe.de/produkte/<slug>/7352005), and the search finds a product by its id.
 */
export function searchTerm(input: string) {
	const link = /rewe\.de\/(?:shop\/)?(?:p|produkte)\/[^/?#]+\/(\d+)/.exec(input);
	if (link) return link[1]!;
	return input
		.replace(/\(inkl\. Pfand\)/i, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export type LinkSource = 'system' | 'user';

/**
 * Who may (re)link a line to a shop product: anyone while it has none. Once linked, only with the
 * "edit links" setting on: links picked by people for everyone, the automatic ones only for admins.
 */
export const canLink = (
	source: LinkSource | null,
	user: { isAdmin: boolean; editLinks: boolean }
) => !source || (user.editLinks && (source === 'user' || user.isAdmin));
