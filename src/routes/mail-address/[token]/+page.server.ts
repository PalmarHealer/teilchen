import { error, redirect } from '@sveltejs/kit';
import { confirmAddress, pendingAddress } from '#lib/server/mail-addresses.ts';
import type { Actions, PageServerLoad } from './$types';

// Confirming takes a click: mail scanners open links on their own.
export const load: PageServerLoad = async ({ locals, params }) => {
	const address = await pendingAddress(params.token, locals.user!.id);
	if (!address) error(404, 'errors.addressLinkInvalid');
	return { address };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		if (!(await confirmAddress(params.token, locals.user!.id)))
			error(404, 'errors.addressLinkInvalid');
		redirect(303, '/settings');
	}
};
