import { redirect } from '@sveltejs/kit';
import * as client from 'openid-client';
import { oidc, redirectUri } from '#lib/server/auth/oidc.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const config = await oidc();
	const verifier = client.randomPKCECodeVerifier();
	const state = client.randomState();
	const opts = { path: '/auth', httpOnly: true, sameSite: 'lax', maxAge: 600 } as const;
	cookies.set('oidc_verifier', verifier, opts);
	cookies.set('oidc_state', state, opts);
	cookies.set('oidc_next', url.searchParams.get('next') ?? '/', opts);
	const target = client.buildAuthorizationUrl(config, {
		redirect_uri: redirectUri(),
		// offline_access: a refresh token, so sessions can re-check the account (auth/session.ts)
		scope: 'openid profile email offline_access',
		code_challenge: await client.calculatePKCECodeChallenge(verifier),
		code_challenge_method: 'S256',
		state
	});
	// SvelteKit 3 rejects external redirects unless their origin is allowed explicitly.
	redirect(302, target.toString(), { external: [target.origin] });
};
