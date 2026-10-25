import { fail, redirect } from '@sveltejs/kit';
import { connect, createExpense } from '#lib/server/domain.ts';
import { expenseFormOptions, parseExpenseForm } from '#lib/server/expense-form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => ({
	...(await expenseFormOptions(locals.user!.id)),
	preset: {
		person: url.searchParams.get('person'),
		group: url.searchParams.get('group')
	}
});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const me = locals.user!.id;
		const v = await parseExpenseForm(await request.formData(), me);
		if (!v.ok) return fail(v.status, { message: v.message });
		await createExpense({
			groupId: v.groupId,
			payerId: v.payerId,
			createdBy: me,
			title: v.title,
			icon: v.icon,
			shares: v.shares,
			spentAt: v.spentAt
		});
		if (!v.groupId) for (const p of v.people) await connect(me, p);
		redirect(303, v.groupId ? `/groups/${v.groupId}` : '/');
	}
};
