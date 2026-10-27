import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { allocate, centsToInput } from '#lib/money.ts';
import { canManageExpense } from '#lib/permissions.ts';
import {
	deleteExpense,
	getExpense,
	groupMemberIds,
	updateExpense,
	usersByIds
} from '#lib/server/domain.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { expenseFormOptions, parseExpenseForm } from '#lib/server/expense-form.ts';
import { rebookReceipt, receiptSplit, resetReceipt } from '#lib/server/receipt-split.ts';
import { isUuid } from '#lib/uuid.ts';
import type { Actions, PageServerLoad } from './$types';

/** Visible to everyone involved and to members of its group. */
async function visibleExpense(id: string, me: string) {
	const expense = await getExpense(id);
	if (!expense) error(404, 'errors.expenseNotFound');
	const involved =
		expense.payerId === me ||
		expense.shares.some((s) => s.userId === me) ||
		(expense.groupId !== null && (await groupMemberIds(expense.groupId)).includes(me));
	if (!involved) error(404, 'errors.expenseNotFound');
	return { expense, canManage: canManageExpense(me, expense, expense.groupCreatedBy) };
}

/** The receipt behind a booking, if it records who swiped it (older bookings don't). */
async function swipedReceipt(receiptId: string | null) {
	const split = receiptId ? await receiptSplit(receiptId) : null;
	return split?.receipt.participants.length ? split : null;
}

const berlinDate = (d: Date) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d); // YYYY-MM-DD

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const { expense, canManage } = await visibleExpense(params.id, me);
	const split = await swipedReceipt(expense.receiptId);
	const people = await usersByIds([
		expense.payerId,
		...expense.shares.map((s) => s.userId),
		...(split?.everyone ?? [])
	]);

	// Readable name and photo of the lines that are linked to a shop product
	const links = new Map(
		split
			? (
					await db
						.select({
							name: schema.productLinks.name,
							title: sql<
								string | null
							>`coalesce(${schema.productLinks.label}, ${schema.productLinks.title})`,
							imageUrl: schema.productLinks.imageUrl
						})
						.from(schema.productLinks)
						.where(
							inArray(
								schema.productLinks.name,
								split.lines.map((l) => l.name)
							)
						)
				).map((l) => [l.name, l])
			: []
	);

	// Equal split if the stored shares are exactly what an equal split would produce.
	const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b).join();
	const shareCents = expense.shares.map((s) => s.cents);
	const equal =
		sorted(shareCents) ===
		sorted(
			allocate(
				expense.amountCents,
				shareCents.map(() => 1)
			)
		);

	return {
		expense: {
			id: expense.id,
			kind: expense.kind,
			title: expense.title,
			icon: expense.icon,
			amountCents: expense.amountCents,
			spentAt: expense.spentAt,
			groupId: expense.groupId,
			payerName: people.get(expense.payerId)?.name ?? '?',
			fromReceipt: expense.receiptId !== null,
			shares: expense.shares.map((s) => ({ ...s, name: people.get(s.userId)?.name ?? '?' }))
		},
		canManage,
		// Everyone in a receipt booking may swipe it again for themselves; the payer starts over.
		canResplit: split
			? split.everyone.includes(me)
			: canManage && expense.receiptId !== null && expense.payerId === me,
		receipt: split && {
			canEdit: split.everyone.includes(me),
			isPayer: split.receipt.ownerId === me,
			conflicts: split.conflicts,
			people: split.everyone.map((id) => ({ id, name: people.get(id)?.name ?? '?' })),
			pending: split.everyone.filter((id) => !split.swiped.has(id)).length,
			discountCents: split.lines
				.filter((l) => l.kind === 'discount')
				.reduce((a, l) => a + l.totalCents, 0),
			lines: split.lines
				.filter((l) => l.kind === 'product')
				.map((l) => ({
					id: l.id,
					name: links.get(l.name)?.title ?? l.name,
					imageUrl: links.get(l.name)?.imageUrl ?? null,
					quantity: l.quantity,
					unit: l.unit,
					cents: l.totalCents,
					manual: !!l.owners?.length,
					conflict: l.pieces.some((p) => p.conflict),
					pieces: l.pieces.map((p) => ({ cents: p.cents, owners: p.owners })),
					votes: [...split.swiped]
						.filter(([, d]) => d[l.id])
						.map(([userId, d]) => ({ userId, decision: d[l.id]! }))
				}))
		},
		edit:
			canManage && expense.kind === 'expense' && !expense.receiptId
				? {
						...(await expenseFormOptions(me)),
						initial: {
							title: expense.title,
							amount: centsToInput(expense.amountCents),
							date: berlinDate(expense.spentAt),
							context: expense.groupId ? `group:${expense.groupId}` : 'direct',
							payer: expense.payerId,
							participants: expense.shares.map((s) => s.userId),
							mode: equal ? ('equal' as const) : ('exact' as const),
							exact: Object.fromEntries(
								expense.shares.map((s) => [s.userId, centsToInput(s.cents)])
							),
							icon: expense.icon
						}
					}
				: null
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { expense, canManage } = await visibleExpense(params.id, me);
		if (!canManage || expense.kind !== 'expense' || expense.receiptId)
			return fail(403, { message: 'errors.notAllowed' as const });
		const v = await parseExpenseForm(await request.formData(), me);
		if (!v.ok) return fail(v.status, { message: v.message });
		await updateExpense(expense.id, {
			groupId: v.groupId,
			payerId: v.payerId,
			title: v.title,
			icon: v.icon,
			shares: v.shares,
			spentAt: v.spentAt
		});
		redirect(303, v.groupId ? `/groups/${v.groupId}` : '/expenses');
	},

	delete: async ({ locals, params }) => {
		const { expense, canManage } = await visibleExpense(params.id, locals.user!.id);
		if (!canManage) return fail(403, { message: 'errors.notAllowed' as const });
		await deleteExpense(expense);
		redirect(303, expense.groupId ? `/groups/${expense.groupId}` : '/expenses');
	},

	/**
	 * Receipt bookings: the payer drops the booking with all swipes and starts over; anyone
	 * else in it swipes their part again.
	 */
	resplit: async ({ locals, params }) => {
		const me = locals.user!.id;
		const { expense, canManage } = await visibleExpense(params.id, me);
		if (!expense.receiptId) return fail(403, { message: 'errors.notAllowed' as const });
		const split = await swipedReceipt(expense.receiptId);
		if (split?.receipt.ownerId === me || (!split && canManage && expense.payerId === me)) {
			await resetReceipt(expense.receiptId);
		} else if (split?.everyone.includes(me)) {
			await db.transaction(async (tx) => {
				await tx
					.delete(schema.receiptSwipes)
					.where(
						and(
							eq(schema.receiptSwipes.receiptId, expense.receiptId!),
							eq(schema.receiptSwipes.userId, me)
						)
					);
				await rebookReceipt(expense.receiptId!, tx);
			});
		} else {
			return fail(403, { message: 'errors.notAllowed' as const });
		}
		redirect(303, `/swipe/${expense.receiptId}`);
	},

	/** Receipt bookings: who gets one line, set by hand (or back to what the swipes say). */
	setOwners: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { expense } = await visibleExpense(params.id, me);
		const split = await swipedReceipt(expense.receiptId);
		if (!split?.everyone.includes(me)) return fail(403, { message: 'errors.notAllowed' as const });
		const form = await request.formData();
		const item = form.get('item');
		const line = split.lines.find((l) => l.id === item && l.kind === 'product');
		if (!isUuid(item) || !line) return fail(400, { message: 'errors.invalidInput' as const });
		const owners = form.has('reset')
			? null
			: split.everyone.filter((id) => form.getAll('owner').includes(id));
		if (owners && !owners.length) return fail(400, { message: 'errors.atLeastOne' as const });
		await db.transaction(async (tx) => {
			await tx
				.update(schema.receiptItems)
				.set({ owners })
				.where(eq(schema.receiptItems.id, line.id));
			await rebookReceipt(split.receipt.id, tx);
		});
		return { ownersSaved: true };
	}
};
