import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { isLocale, LANG_COOKIE, negotiate } from '#lib/i18n/index.ts';
import { SESSION_COOKIE, userFromSession } from '#lib/server/auth/session.ts';

const PUBLIC = ['/login', '/auth/', '/icons/'];

// The CSP itself is configured in vite.config.ts.
const SECURITY_HEADERS = {
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'DENY',
	// Invite links carry their token in the URL: never send it to other sites.
	'referrer-policy': 'same-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

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
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
	if (event.url.protocol === 'https:')
		response.headers.set('strict-transport-security', 'max-age=31536000');
	return response;
};
