import { fail, redirect } from '@sveltejs/kit';
import { db, schema } from '#lib/server/db/index.ts';
import { groupsOf } from '#lib/server/domain.ts';
import { isGroupIcon } from '#lib/group-icons.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	groups: await groupsOf(locals.user!.id)
});

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
