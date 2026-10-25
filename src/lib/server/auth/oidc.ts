import * as client from 'openid-client';
import { env } from '../db/env';

let config: Promise<client.Configuration> | undefined;

export function oidc() {
	config ??= client
		.discovery(new URL(env('OIDC_ISSUER')), env('OIDC_CLIENT_ID'), env('OIDC_CLIENT_SECRET'))
		.catch((e) => {
			config = undefined;
			throw e;
		});
	return config;
}

export const redirectUri = () => new URL('/auth/callback', env('ORIGIN')).toString();
