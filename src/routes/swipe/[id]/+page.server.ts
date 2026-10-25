import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { formatDate, translate } from '#lib/i18n/index.ts';
import { sharesFromItems } from '#lib/split.ts';
import { db, schema } from '#lib/server/db/index.ts';
import {
	connect,
	contactsOf,
	createExpense,
	groupMemberIds,
	groupsOf
} from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

async function ownReceipt(id: string, userId: string) {
	const [receipt] = await db
		.select()
		.from(schema.receipts)
		.where(
			and(
				eq(schema.receipts.id, id),
				eq(schema.receipts.ownerId, userId),
				isNull(schema.receipts.expenseId)
			)
		);
	if (!receipt) error(404, 'errors.receiptNotFound');
	return receipt;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const receipt = await ownReceipt(params.id, me);
	const items = await db
		.select({
			id: schema.receiptItems.id,
			name: schema.receiptItems.name,
			quantity: schema.receiptItems.quantity,
			unit: schema.receiptItems.unit,
			totalCents: schema.receiptItems.totalCents
		})
		.from(schema.receiptItems)
		.where(eq(schema.receiptItems.receiptId, receipt.id))
		.orderBy(asc(schema.receiptItems.position));
	const groups = await Promise.all(
		(await groupsOf(me)).map(async (g) => ({ ...g, memberIds: await groupMemberIds(g.id) }))
	);
	return {
		receipt: {
			id: receipt.id,
			market: receipt.market,
			purchasedAt: receipt.purchasedAt,
			totalCents: receipt.totalCents
		},
		items,
		contacts: await contactsOf(me),
		groups
	};
};

const BookInput = z.object({
	target: z.string().regex(/^(user|group):[0-9a-f-]{36}$/),
	decisions: z.record(z.string().uuid(), z.enum(['mine', 'shared', 'theirs']))
});

export const actions: Actions = {
	book: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const receipt = await ownReceipt(params.id, me);
		const form = await request.formData();
		const parsed = BookInput.safeParse({
			target: form.get('target'),
			decisions: JSON.parse(String(form.get('decisions') ?? '{}'))
		});
		if (!parsed.success) return fail(400, { message: 'errors.invalidInput' as const });
		const { target, decisions } = parsed.data;

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

		const items = await db
			.select()
			.from(schema.receiptItems)
			.where(eq(schema.receiptItems.receiptId, receipt.id));
		if (items.some((i) => !decisions[i.id]))
			return fail(400, { message: 'errors.notAllSwiped' as const });
		const decided = items.map((i) => ({ ...i, decision: decisions[i.id]! }));
		const shares = sharesFromItems(me, participants, decided);

		await db.transaction(async (tx) => {
			for (const i of decided) {
				await tx
					.update(schema.receiptItems)
					.set({ decision: i.decision })
					.where(eq(schema.receiptItems.id, i.id));
			}
			const othersPay = [...shares].some(([id, c]) => id !== me && c !== 0);
			if (!othersPay) {
				await tx
					.update(schema.receipts)
					.set({ dismissed: true })
					.where(eq(schema.receipts.id, receipt.id));
				return;
			}
			const date = formatDate(locals.locale, receipt.purchasedAt, {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			});
			const expenseId = await createExpense(
				{
					groupId,
					payerId: me,
					createdBy: me,
					title: translate(locals.locale, 'expenses.receiptTitle', { date }),
					shares,
					spentAt: receipt.purchasedAt
				},
				tx
			);
			await tx.update(schema.receipts).set({ expenseId }).where(eq(schema.receipts.id, receipt.id));
		});
		if (kind === 'user') await connect(me, targetId);
		redirect(303, '/swipe');
	},

	dismiss: async ({ locals, params }) => {
		const receipt = await ownReceipt(params.id, locals.user!.id);
		await db
			.update(schema.receipts)
			.set({ dismissed: true })
			.where(eq(schema.receipts.id, receipt.id));
		redirect(303, '/swipe');
	}
};
