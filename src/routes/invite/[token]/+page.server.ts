import { error, redirect } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { connect } from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

async function validInvite(token: string) {
	const [row] = await db
		.select({
			invite: schema.invites,
			inviterName: schema.users.name,
			groupName: schema.groups.name,
			groupIcon: schema.groups.icon
		})
		.from(schema.invites)
		.innerJoin(schema.users, eq(schema.users.id, schema.invites.inviterId))
		.leftJoin(schema.groups, eq(schema.groups.id, schema.invites.groupId))
		.where(and(eq(schema.invites.token, token), gt(schema.invites.expiresAt, new Date())));
	if (!row) error(404, 'errors.inviteInvalid');
	return row;
}

export const load: PageServerLoad = async ({ params }) => {
	const { inviterName, groupName, groupIcon } = await validInvite(params.token);
	return { inviterName, groupName, groupIcon };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const { invite } = await validInvite(params.token);
		const me = locals.user!.id;
		await connect(me, invite.inviterId);
		if (invite.groupId) {
			await db
				.insert(schema.groupMembers)
				.values({ groupId: invite.groupId, userId: me })
				.onConflictDoNothing();
			redirect(303, `/groups/${invite.groupId}`);
		}
		redirect(303, `/people/${invite.inviterId}`);
	}
};
