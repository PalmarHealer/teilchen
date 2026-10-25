import { error, redirect } from '@sveltejs/kit';
import * as client from 'openid-client';
import { createSession } from '#lib/server/auth/session.ts';
import { oidc, redirectUri } from '#lib/server/auth/oidc.ts';
import { db, schema } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const verifier = cookies.get('oidc_verifier');
	const state = cookies.get('oidc_state');
	const next = cookies.get('oidc_next') ?? '/';
	if (!verifier || !state) error(400, 'Login abgelaufen, bitte erneut versuchen');
	for (const c of ['oidc_verifier', 'oidc_state', 'oidc_next'])
		cookies.delete(c, { path: '/auth' });

	// Callback-URL über ORIGIN rekonstruieren, damit es hinter einem Reverse-Proxy passt.
	const current = new URL(redirectUri());
	current.search = url.search;
	const tokens = await client.authorizationCodeGrant(await oidc(), current, {
		pkceCodeVerifier: verifier,
		expectedState: state
	});
	const claims = tokens.claims();
	if (!claims) error(400, 'Kein ID-Token erhalten');

	const profile = {
		email: String(claims.email ?? ''),
		name: String(claims.name ?? claims.preferred_username ?? claims.email ?? 'Unbekannt'),
		avatarUrl: typeof claims.picture === 'string' ? claims.picture : null
	};
	const [user] = await db
		.insert(schema.users)
		.values({ oidcSub: claims.sub, ...profile })
		.onConflictDoUpdate({ target: schema.users.oidcSub, set: profile })
		.returning();
	await createSession(cookies, user!.id);
	redirect(302, next.startsWith('/') && !next.startsWith('//') ? next : '/');
};
