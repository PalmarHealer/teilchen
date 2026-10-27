import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { formatDate, translate, type Locale } from '#lib/i18n/index.ts';
import { unitCount } from '#lib/split.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { UUID_SOURCE } from '#lib/uuid.ts';
import {
	connect,
	contactsOf,
	createExpense,
	groupMemberIds,
	groupsOf,
	usersByIds
} from '#lib/server/domain.ts';
import { rebookReceipt, saveSwipe } from '#lib/server/receipt-split.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * A receipt I can swipe: my own one before it's booked, or a booked one I'm part of but haven't
 * swiped yet (to say what was mine).
 */
async function swipeableReceipt(id: string, me: string) {
	const [receipt] = await db.select().from(schema.receipts).where(eq(schema.receipts.id, id));
	if (receipt?.ownerId === me && !receipt.expenseId) return { receipt, payer: true as const };
	if (receipt?.expenseId && receipt.ownerId !== me && receipt.participants.includes(me)) {
		const [swiped] = await db
			.select({ at: schema.receiptSwipes.swipedAt })
			.from(schema.receiptSwipes)
			.where(and(eq(schema.receiptSwipes.receiptId, id), eq(schema.receiptSwipes.userId, me)));
		if (!swiped) return { receipt, payer: false as const };
	}
	error(404, 'errors.receiptNotFound');
}

const receiptTitle = (locale: Locale, at: Date) =>
	translate(locale, 'expenses.receiptTitle', {
		date: formatDate(locale, at, { day: '2-digit', month: '2-digit', year: 'numeric' })
	});

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const { receipt, payer } = await swipeableReceipt(params.id, me);
	const items = await db
		.select({
			id: schema.receiptItems.id,
			name: schema.receiptItems.name,
			quantity: schema.receiptItems.quantity,
			unit: schema.receiptItems.unit,
			totalCents: schema.receiptItems.totalCents,
			kind: schema.receiptItems.kind,
			discountable: schema.receiptItems.discountable
		})
		.from(schema.receiptItems)
		.where(eq(schema.receiptItems.receiptId, receipt.id))
		.orderBy(asc(schema.receiptItems.position));
	const base = {
		receipt: {
			id: receipt.id,
			market: receipt.market,
			purchasedAt: receipt.purchasedAt,
			totalCents: receipt.totalCents
		},
		items
	};

	if (!payer) {
		// Swiping someone else's booking: who it's split with is already fixed.
		const [expense] = await db
			.select({ groupId: schema.expenses.groupId })
			.from(schema.expenses)
			.where(eq(schema.expenses.id, receipt.expenseId!));
		const people = await usersByIds(receipt.participants);
		const group = expense?.groupId
			? (await groupsOf(me)).find((g) => g.id === expense.groupId)
			: undefined;
		const owner = people.get(receipt.ownerId);
		return {
			...base,
			payerName: owner?.name ?? null,
			fixedTarget: group ? `group:${group.id}` : `user:${receipt.ownerId}`,
			contacts: group || !owner ? [] : [owner],
			groups: group ? [{ ...group, memberIds: receipt.participants }] : [],
			names: Object.fromEntries([...people].map(([id, u]) => [id, u.name])) as Record<
				string,
				string
			>
		};
	}

	const groups = await Promise.all(
		(await groupsOf(me)).map(async (g) => ({ ...g, memberIds: await groupMemberIds(g.id) }))
	);
	return {
		...base,
		payerName: null,
		fixedTarget: null,
		contacts: await contactsOf(me),
		groups,
		// Names for the per-person preview; group members need not be contacts
		names: Object.fromEntries(
			[...(await usersByIds([...new Set(groups.flatMap((g) => g.memberIds))]))].map(([id, u]) => [
				id,
				u.name
			])
		) as Record<string, string>
	};
};

const Decision = z.enum(['mine', 'shared', 'theirs']);
const BookInput = z.object({
	target: z.string().regex(new RegExp(`^(user|group):${UUID_SOURCE}$`)),
	// One decision per line, or one per piece for lines swiped piece by piece
	decisions: z.record(z.string().uuid(), z.union([Decision, z.array(Decision)]))
});

export const actions: Actions = {
	book: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { receipt, payer } = await swipeableReceipt(params.id, me);
		const form = await request.formData();
		let raw: unknown;
		try {
			raw = JSON.parse(String(form.get('decisions') ?? '{}'));
		} catch {
			return fail(400, { message: 'errors.invalidInput' as const });
		}
		const parsed = BookInput.safeParse({ target: form.get('target'), decisions: raw });
		if (!parsed.success) return fail(400, { message: 'errors.invalidInput' as const });
		const { target, decisions } = parsed.data;

		const items = await db
			.select()
			.from(schema.receiptItems)
			.where(eq(schema.receiptItems.receiptId, receipt.id));
		// Only products are swiped; discounts are spread over them when the shares are computed.
		const swiped = (i: (typeof items)[number]) => {
			const d = decisions[i.id];
			return Array.isArray(d) ? d.length === unitCount(i.quantity, i.unit) && d.length > 1 : !!d;
		};
		if (items.some((i) => i.kind === 'product' && !swiped(i)))
			return fail(400, { message: 'errors.notAllSwiped' as const });
		const own = Object.fromEntries(
			items.filter((i) => i.kind === 'product').map((i) => [i.id, decisions[i.id]!])
		);

		if (!payer) {
			await db.transaction(async (tx) => {
				await saveSwipe(tx, receipt.id, me, own);
				await rebookReceipt(receipt.id, tx);
			});
			redirect(303, `/expenses/${receipt.expenseId}`);
		}

		const [kind, targetId] = target.split(':') as ['user' | 'group', string];
		let participants: string[];
		let groupId: string | null = null;
		if (kind === 'group') {
			participants = await groupMemberIds(targetId);
			if (!participants.includes(me)) return fail(403, { message: 'errors.notYourGroup' as const });
			groupId = targetId;
		} else {
			if (!(await contactsOf(me)).some((c) => c.id === targetId))
				return fail(403, { message: 'errors.unknownPerson' as const });
			participants = [me, targetId];
		}

		// Booked right away with my swipe; the others can swipe it too and correct it.
		await db.transaction(async (tx) => {
			const expenseId = await createExpense(
				{
					groupId,
					payerId: me,
					createdBy: me,
					title: receiptTitle(locals.locale, receipt.purchasedAt),
					shares: new Map(),
					spentAt: receipt.purchasedAt
				},
				tx
			);
			await tx
				.update(schema.receipts)
				.set({ expenseId, participants })
				.where(eq(schema.receipts.id, receipt.id));
			await saveSwipe(tx, receipt.id, me, own);
			await rebookReceipt(receipt.id, tx);
		});
		if (kind === 'user') await connect(me, targetId);
		redirect(303, '/swipe');
	},

	/** Not shared: an expense of mine alone, so it still shows up under expenses. */
	dismiss: async ({ locals, params }) => {
		const me = locals.user!.id;
		const { receipt, payer } = await swipeableReceipt(params.id, me);
		if (!payer) error(404, 'errors.receiptNotFound');
		await db.transaction(async (tx) => {
			const expenseId = await createExpense(
				{
					groupId: null,
					payerId: me,
					createdBy: me,
					title: receiptTitle(locals.locale, receipt.purchasedAt),
					shares: new Map(),
					spentAt: receipt.purchasedAt
				},
				tx
			);
			await tx
				.update(schema.receipts)
				.set({ expenseId, participants: [me] })
				.where(eq(schema.receipts.id, receipt.id));
			await rebookReceipt(receipt.id, tx);
		});
		redirect(303, '/swipe');
	}
};
