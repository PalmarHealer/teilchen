import { error, fail } from '@sveltejs/kit';
import { and, asc, count, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '#lib/server/db/index.ts';
import {
	linkProduct,
	renameProduct,
	searchProducts,
	shopRetryIn
} from '#lib/server/product-images.ts';
import type { Actions, PageServerLoad } from './$types';

const { productLinks, productMisses, receiptItems, inboundMails, users } = schema;

const MAILS_SHOWN = 30;

function adminOnly(user: App.Locals['user']) {
	if (!user?.isAdmin) error(403, 'errors.notAdmin');
	return user;
}

export const load: PageServerLoad = async ({ locals }) => {
	adminOnly(locals.user);
	const [products, unlinked, mails] = await Promise.all([
		db
			.select({
				name: productLinks.name,
				title: productLinks.title,
				label: productLinks.label,
				imageUrl: productLinks.imageUrl,
				source: productLinks.source,
				linkedAt: productLinks.linkedAt
			})
			.from(productLinks)
			.where(isNotNull(productLinks.source))
			.orderBy(asc(productLinks.name)),
		// Product lines without a shop product (an admin's label alone doesn't count), most bought first
		db
			.select({
				name: receiptItems.name,
				label: max(productLinks.label),
				count: count(),
				missed: max(productMisses.searchedAt)
			})
			.from(receiptItems)
			.leftJoin(productLinks, eq(productLinks.name, receiptItems.name))
			.leftJoin(productMisses, eq(productMisses.name, receiptItems.name))
			.where(and(eq(receiptItems.kind, 'product'), isNull(productLinks.source)))
			.groupBy(receiptItems.name)
			.orderBy(desc(count()), asc(receiptItems.name)),
		db
			.select({
				messageId: inboundMails.messageId,
				status: inboundMails.status,
				detail: inboundMails.detail,
				receivedAt: inboundMails.receivedAt,
				userName: users.name
			})
			.from(inboundMails)
			.leftJoin(users, eq(users.id, inboundMails.userId))
			.orderBy(desc(inboundMails.receivedAt))
			.limit(MAILS_SHOWN)
	]);
	return { products, unlinked, mails };
};

// `name` is the receipt line's name, the key of a product link
const LinkInput = z.object({
	name: z.string().min(1).max(300),
	query: z.string().trim().min(1).max(300),
	url: z.string().max(300)
});
const RenameInput = z.object({
	name: z.string().min(1).max(300),
	label: z.string().trim().max(120)
});

/** The same as relinking and naming while swiping, for any line, without "edit links" on. */
export const actions: Actions = {
	link: async ({ locals, request }) => {
		const user = adminOnly(locals.user);
		const parsed = LinkInput.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'errors.invalidInput' as const });
		const { name, query, url } = parsed.data;
		const hits = await searchProducts(query);
		if (!hits)
			return fail(503, { message: 'errors.shopUnavailable' as const, retryIn: shopRetryIn() });
		const hit = hits.find((h) => h.imageUrl === url);
		if (!hit) return fail(400, { message: 'errors.productNotFound' as const });
		await linkProduct(name, hit, { source: 'user', userId: user.id });
	},

	rename: async ({ locals, request }) => {
		const user = adminOnly(locals.user);
		const parsed = RenameInput.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'errors.invalidInput' as const });
		await renameProduct(parsed.data.name, parsed.data.label || null, user.id);
	}
};
