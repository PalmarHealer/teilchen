import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { groupBalances, isSettled, personBalances } from '#lib/ledger.ts';
import { translate } from '#lib/i18n/index.ts';
import { parseCents } from '#lib/money.ts';
import { randomToken } from '#lib/server/crypto.ts';
import { isIcon } from '#lib/server/tabler.ts';
import { db, schema } from '#lib/server/db/index.ts';
import {
	connect,
	entriesForGroup,
	groupMemberIds,
	recentExpenses,
	settleWith,
	usersByIds
} from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

async function membership(groupId: string, userId: string) {
	const memberIds = await groupMemberIds(groupId);
	if (!memberIds.includes(userId)) error(404, 'errors.groupNotFound');
	const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId));
	return { group: group!, memberIds };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const { group, memberIds } = await membership(params.id, me);
	const members = await usersByIds(memberIds);
	const entries = await entriesForGroup(params.id);
	const totals = groupBalances(memberIds, entries);
	const mine = personBalances(me, entries);
	return {
		group,
		isCreator: group.createdBy === me,
		settled: isSettled(totals),
		// Oldest member first: the suggested next creator when the creator leaves.
		others: memberIds
			.filter((id) => id !== me)
			.map((id) => ({ id, name: members.get(id)?.name ?? '?' })),
		members: memberIds.map((id) => ({
			...members.get(id)!,
			balance: totals.get(id) ?? 0,
			withMe: id === me ? null : (mine.get(id)?.net ?? 0)
		})),
		expenses: await recentExpenses(me, params.id, 100)
	};
};

export const actions: Actions = {
	invite: async ({ locals, params, url }) => {
		await membership(params.id, locals.user!.id);
		const token = randomToken(12);
		await db.insert(schema.invites).values({
			token,
			inviterId: locals.user!.id,
			groupId: params.id,
			expiresAt: new Date(Date.now() + 7 * 864e5)
		});
		return { inviteUrl: new URL(`/invite/${token}`, url.origin).toString() };
	},

	/** Any member may rename the group or change its icon. */
	update: async ({ locals, params, request }) => {
		await membership(params.id, locals.user!.id);
		const fd = await request.formData();
		const name = String(fd.get('name') ?? '').trim();
		const icon = fd.get('icon');
		if (!name) return fail(400, { manageError: 'errors.nameMissing' as const });
		await db
			.update(schema.groups)
			.set({
				name: name.slice(0, 60),
				keepDebts: fd.get('keepDebts') === 'on',
				...(isIcon(icon) ? { icon } : {})
			})
			.where(eq(schema.groups.id, params.id));
		return { updated: true };
	},

	/** In a group that keeps its debts, two members settle what is open between them right here. */
	settle: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { group, memberIds } = await membership(params.id, me);
		const fd = await request.formData();
		const other = fd.get('member');
		if (!group.keepDebts || typeof other !== 'string' || other === me || !memberIds.includes(other))
			return fail(400, { message: 'errors.nothingToSettle' as const });
		const raw = String(fd.get('amount') ?? '').trim();
		const cents = raw ? parseCents(raw) : undefined;
		if (cents === null || (cents !== undefined && cents <= 0))
			return fail(400, { message: 'errors.invalidAmount' as const });
		const title = translate(locals.locale, 'expenses.settlementTitle');
		const entries = await entriesForGroup(params.id);
		const plan = await settleWith(me, other, title, { entries, cents });
		if (!plan.lines.length) return fail(400, { message: 'errors.nothingToSettle' as const });
		return { settled: other };
	},

	/**
	 * Leaving keeps all bookings: balances with the other members stay visible on their person
	 * pages, which is why everyone in the group becomes a direct contact first.
	 */
	leave: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { group, memberIds } = await membership(params.id, me);
		if (group.createdBy === me) {
			// The creator role must not get lost: hand it over, or delete the group when alone.
			if (memberIds.length === 1)
				return fail(400, { manageError: 'errors.soleCreatorMustDelete' as const });
			const next = (await request.formData()).get('newCreator');
			if (typeof next !== 'string' || next === me || !memberIds.includes(next))
				return fail(400, { manageError: 'errors.chooseNewCreator' as const });
			await db
				.update(schema.groups)
				.set({ createdBy: next })
				.where(eq(schema.groups.id, params.id));
		}
		for (const other of memberIds) await connect(me, other);
		await db
			.delete(schema.groupMembers)
			.where(and(eq(schema.groupMembers.groupId, params.id), eq(schema.groupMembers.userId, me)));
		redirect(303, '/groups');
	},

	/** Deleting removes the group's bookings, so only the creator may, and only once all is settled. */
	delete: async ({ locals, params }) => {
		const me = locals.user!.id;
		const { group, memberIds } = await membership(params.id, me);
		if (group.createdBy !== me)
			return fail(403, { manageError: 'errors.onlyCreatorDeletes' as const });
		if (!isSettled(groupBalances(memberIds, await entriesForGroup(params.id))))
			return fail(400, { manageError: 'errors.groupNotSettled' as const });
		await db.delete(schema.groups).where(eq(schema.groups.id, params.id));
		redirect(303, '/groups');
	}
};
