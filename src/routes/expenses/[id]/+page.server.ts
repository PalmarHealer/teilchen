import { error, fail, redirect } from '@sveltejs/kit';
import { allocate, centsToInput } from '#lib/money.ts';
import { canManageExpense } from '#lib/permissions.ts';
import {
	deleteExpense,
	getExpense,
	groupMemberIds,
	updateExpense,
	usersByIds
} from '#lib/server/domain.ts';
import { expenseFormOptions, parseExpenseForm } from '#lib/server/expense-form.ts';
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

const berlinDate = (d: Date) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d); // YYYY-MM-DD

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const { expense, canManage } = await visibleExpense(params.id, me);
	const people = await usersByIds([expense.payerId, ...expense.shares.map((s) => s.userId)]);

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

	/** Receipt bookings: drop the booking and swipe the receipt again. */
	resplit: async ({ locals, params }) => {
		const me = locals.user!.id;
		const { expense, canManage } = await visibleExpense(params.id, me);
		if (!canManage || !expense.receiptId)
			return fail(403, { message: 'errors.notAllowed' as const });
		await deleteExpense(expense);
		redirect(303, expense.payerId === me ? `/swipe/${expense.receiptId}` : '/expenses');
	}
};
