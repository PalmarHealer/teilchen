import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, userFromSession } from '#lib/server/auth/session.ts';

const PUBLIC = ['/anmelden', '/auth/'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await userFromSession(event.cookies.get(SESSION_COOKIE));
	const path = event.url.pathname;
	if (!event.locals.user && !PUBLIC.some((p) => path.startsWith(p))) {
		redirect(303, `/anmelden?next=${encodeURIComponent(path + event.url.search)}`);
	}
	return resolve(event);
};
