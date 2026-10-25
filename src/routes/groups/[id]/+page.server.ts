import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { personBalances } from '#lib/ledger.ts';
import { randomToken } from '#lib/server/crypto.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { entriesForGroup, groupMemberIds, recentExpenses, usersByIds } from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const memberIds = await groupMemberIds(params.id);
	if (!memberIds.includes(me)) error(404, 'errors.groupNotFound');
	const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, params.id));
	const members = await usersByIds(memberIds);
	const entries = await entriesForGroup(params.id);

	// Each member's group balance = paid − consumed
	const totals = new Map(memberIds.map((id) => [id, 0]));
	for (const e of entries) {
		for (const s of e.shares) {
			totals.set(e.payerId, (totals.get(e.payerId) ?? 0) + s.cents);
			totals.set(s.userId, (totals.get(s.userId) ?? 0) - s.cents);
		}
	}
	const mine = personBalances(me, entries);
	return {
		group: group!,
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
		if (!(await groupMemberIds(params.id)).includes(locals.user!.id)) error(404);
		const token = randomToken(12);
		await db.insert(schema.invites).values({
			token,
			inviterId: locals.user!.id,
			groupId: params.id,
			expiresAt: new Date(Date.now() + 7 * 864e5)
		});
		return { inviteUrl: new URL(`/invite/${token}`, url.origin).toString() };
	}
};
