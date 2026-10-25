import { fail, redirect } from '@sveltejs/kit';
import { isGroupIcon } from '#lib/group-icons.ts';
import { groupBalances } from '#lib/ledger.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { entriesForGroup, groupMemberIds, groupsOf, usersByIds } from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const groups = await Promise.all(
		(await groupsOf(me)).map(async (g) => {
			const memberIds = await groupMemberIds(g.id);
			const balances = groupBalances(memberIds, await entriesForGroup(g.id));
			const members = await usersByIds(memberIds.filter((id) => id !== me).slice(0, 3));
			return {
				...g,
				memberCount: memberIds.length,
				preview: [...members.values()],
				myBalance: balances.get(me) ?? 0
			};
		})
	);
	return { groups };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const fd = await request.formData();
		const name = String(fd.get('name') ?? '').trim();
		const icon = fd.get('icon');
		if (!name) return fail(400, { message: 'errors.nameMissing' as const });
		const id = await db.transaction(async (tx) => {
			const [g] = await tx
				.insert(schema.groups)
				.values({
					name: name.slice(0, 60),
					icon: isGroupIcon(icon) ? icon : 'users',
					createdBy: locals.user!.id
				})
				.returning({ id: schema.groups.id });
			await tx.insert(schema.groupMembers).values({ groupId: g!.id, userId: locals.user!.id });
			return g!.id;
		});
		redirect(303, `/groups/${id}`);
	}
};
