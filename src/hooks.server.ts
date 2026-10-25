import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { isLocale, LANG_COOKIE, negotiate } from '#lib/i18n/index.ts';
import { SESSION_COOKIE, userFromSession } from '#lib/server/auth/session.ts';

const PUBLIC = ['/login', '/auth/'];

export const handle: Handle = async ({ event, resolve }) => {
	const pref = event.cookies.get(LANG_COOKIE);
	event.locals.locale = isLocale(pref)
		? pref
		: negotiate(event.request.headers.get('accept-language'));
	event.locals.user = await userFromSession(event.cookies.get(SESSION_COOKIE));

	const path = event.url.pathname;
	if (!event.locals.user && !PUBLIC.some((p) => path.startsWith(p))) {
		redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
	}
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
