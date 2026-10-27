import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import {
	groupBalances,
	isSettled,
	pairResidue,
	personBalances,
	simplifiedBalances,
	simplifyDebts
} from '#lib/ledger.ts';
import { translate } from '#lib/i18n/index.ts';
import { parseCents } from '#lib/money.ts';
import { randomToken } from '#lib/server/crypto.ts';
import { isIcon } from '#lib/server/tabler.ts';
import { db, schema } from '#lib/server/db/index.ts';
import {
	bookSettlementLines,
	contactStatuses,
	entriesForGroup,
	groupMemberIds,
	recentExpenses,
	requestContact,
	usersByIds
} from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

async function membership(groupId: string, userId: string) {
	const memberIds = await groupMemberIds(groupId);
	if (!memberIds.includes(userId)) error(404, 'errors.groupNotFound');
	const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId));
	return { group: group!, memberIds };
}

/** The group's invites `me` may revoke: all of them for the creator (`me` null), else their own. */
const revocableInvites = (groupId: string, me: string | null) =>
	and(eq(schema.invites.groupId, groupId), me ? eq(schema.invites.inviterId, me) : undefined);

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const { group, memberIds } = await membership(params.id, me);
	const members = await usersByIds(memberIds);
	const entries = await entriesForGroup(params.id);
	const totals = groupBalances(memberIds, entries);
	// A group that keeps its debts settles by its simplified plan; otherwise per person.
	const plan = group.keepDebts ? simplifyDebts(totals) : [];
	const mine = group.keepDebts ? simplifiedBalances(me, entries) : personBalances(me, entries);
	const contacts = await contactStatuses(me, memberIds);
	// Former members can still be part of the plan.
	const names = await usersByIds([...new Set(plan.flatMap((t) => [t.fromId, t.toId]))]);
	const name = (id: string) => names.get(id)?.name ?? '?';
	const openInvites = await db.$count(
		schema.invites,
		and(
			revocableInvites(params.id, group.createdBy === me ? null : me),
			gt(schema.invites.expiresAt, new Date())
		)
	);
	return {
		group,
		isCreator: group.createdBy === me,
		openInvites,
		settled: isSettled(totals),
		// Oldest member first: the suggested next creator when the creator leaves.
		others: memberIds
			.filter((id) => id !== me)
			.map((id) => ({ id, name: members.get(id)?.name ?? '?' })),
		members: memberIds.map((id) => ({
			...members.get(id)!,
			balance: totals.get(id) ?? 0,
			withMe: id === me ? null : (mine.get(id)?.net ?? 0),
			contact: id === me ? null : contacts.get(id)!
		})),
		plan: plan.map((t) => ({ ...t, fromName: name(t.fromId), toName: name(t.toId) })),
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

	revokeInvites: async ({ locals, params }) => {
		const me = locals.user!.id;
		const { group } = await membership(params.id, me);
		await db
			.delete(schema.invites)
			.where(revocableInvites(params.id, group.createdBy === me ? null : me));
		return { invitesRevoked: true };
	},

	/** Any member may rename the group or change its icon. */
	update: async ({ locals, params, request }) => {
		const { group, memberIds } = await membership(params.id, locals.user!.id);
		const fd = await request.formData();
		const name = String(fd.get('name') ?? '').trim();
		const icon = fd.get('icon');
		if (!name) return fail(400, { manageError: 'errors.nameMissing' as const });
		const keepDebts = fd.get('keepDebts') === 'on';
		if (group.keepDebts && !keepDebts) {
			// Back to per-person netting: only once settled, and without the circles simplified
			// payments leave between pairs (they would turn into debts again).
			const entries = await entriesForGroup(params.id);
			if (!isSettled(groupBalances(memberIds, entries)))
				return fail(400, { manageError: 'errors.keepDebtsUnsettled' as const });
			const title = translate(locals.locale, 'groups.closedTitle');
			await bookSettlementLines(locals.user!.id, title, pairResidue(params.id, entries));
		}
		await db
			.update(schema.groups)
			.set({
				name: name.slice(0, 60),
				keepDebts,
				...(isIcon(icon) ? { icon } : {})
			})
			.where(eq(schema.groups.id, params.id));
		return { updated: true };
	},

	/** Members can ask each other to become contacts (to share things outside the group). */
	requestContact: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { memberIds } = await membership(params.id, me);
		const other = (await request.formData()).get('member');
		if (typeof other !== 'string' || other === me || !memberIds.includes(other))
			return fail(400, { message: 'errors.unknownPerson' as const });
		return { contact: await requestContact(me, other) };
	},

	/**
	 * In a group that keeps its debts, a transfer of the simplified plan is paid (by me or to me).
	 * Less than the full amount is a partial payment; more is capped.
	 */
	settle: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { group, memberIds } = await membership(params.id, me);
		const fd = await request.formData();
		const other = fd.get('member');
		const entries = await entriesForGroup(params.id);
		const t = simplifyDebts(groupBalances(memberIds, entries)).find(
			(t) => (t.fromId === me && t.toId === other) || (t.toId === me && t.fromId === other)
		);
		if (!group.keepDebts || !t) return fail(400, { message: 'errors.nothingToSettle' as const });
		const raw = String(fd.get('amount') ?? '').trim();
		const cents = raw ? parseCents(raw) : t.cents;
		if (cents === null || cents <= 0)
			return fail(400, { message: 'errors.invalidAmount' as const });
		const title = translate(locals.locale, 'expenses.settlementTitle');
		await bookSettlementLines(me, title, [
			{ contextId: params.id, fromId: t.fromId, toId: t.toId, cents: Math.min(cents, t.cents) }
		]);
		return { settled: other };
	},

	/**
	 * Leaving keeps all bookings: balances with the other members stay visible on their person
	 * pages (those are open to anyone you share bookings with), without making them contacts.
	 */
	leave: async ({ locals, params, request }) => {
		const me = locals.user!.id;
		const { group, memberIds } = await membership(params.id, me);
		// Kept debts are only settled here, so they must be settled before leaving.
		if (group.keepDebts && groupBalances(memberIds, await entriesForGroup(params.id)).get(me))
			return fail(400, { manageError: 'errors.leaveKeptUnsettled' as const });
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
