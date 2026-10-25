/**
 * Unofficial REWE mobile API (what the REWE app uses). No public contract – can break at any time.
 * Sources: github.com/yannick-cw/korb (Auth.hs, ReweApi.hs), github.com/ByteSizedMarius/rewerse-engineering
 */
import { readFileSync } from 'node:fs';
import { Agent, request } from 'node:https';
import { randomUUID } from 'node:crypto';
import * as oauth from 'openid-client';
import { optionalEnv } from '../db/env';

const SSO = 'https://account.rewe.de/realms/sso/protocol/openid-connect';
const CLIENT_ID = 'reweios';
const REDIRECT = 'de.rewe.app://redirect';
const API = 'https://mobile-clients-api.rewe.de/api';
const UA = 'REWE-Mobile-Client/5.18.1.54501 Android/14 Phone/Google_Pixel_8';

export interface ReweTokens {
	accessToken: string;
	refreshToken: string;
	/** Unix seconds */
	expiresAt: number;
}

export async function reweAuthStart() {
	const verifier = oauth.randomPKCECodeVerifier();
	const url = new URL(`${SSO}/auth`);
	url.search = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT,
		response_type: 'code',
		scope: 'openid email customer offline_access profile',
		code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
		code_challenge_method: 'S256'
	}).toString();
	return { url: url.toString(), verifier };
}

async function tokenRequest(body: Record<string, string>): Promise<ReweTokens> {
	const res = await fetch(`${SSO}/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
		body: new URLSearchParams({ client_id: CLIENT_ID, ...body })
	});
	if (!res.ok) throw new Error(`REWE token endpoint: ${res.status} ${await res.text()}`);
	const json = (await res.json()) as {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};
	return {
		accessToken: json.access_token,
		refreshToken: json.refresh_token,
		expiresAt: Math.floor(Date.now() / 1000) + json.expires_in
	};
}

/** `pasted` is the failed redirect `de.rewe.app://redirect?code=…` copied from the browser. */
export function reweExchangeCode(pasted: string, verifier: string) {
	const code = pasted.trim().match(/[?&]code=([^&#\s]+)/)?.[1];
	if (!code) throw new Error('The pasted URL contains no ?code=…');
	return tokenRequest({
		grant_type: 'authorization_code',
		code: decodeURIComponent(code),
		redirect_uri: REDIRECT,
		code_verifier: verifier
	});
}

export async function reweFreshTokens(t: ReweTokens): Promise<ReweTokens> {
	if (Date.now() / 1000 < t.expiresAt - 30) return t;
	return tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refreshToken });
}

let agent: Agent | undefined;
function mtlsAgent() {
	const cert = optionalEnv('REWE_CERT_PATH');
	const key = optionalEnv('REWE_KEY_PATH');
	if (!cert || !key) throw new Error('REWE_CERT_PATH/REWE_KEY_PATH not set (mTLS certificate)');
	agent ??= new Agent({ cert: readFileSync(cert), key: readFileSync(key), keepAlive: true });
	return agent;
}

function apiGet(
	path: string,
	accessToken: string
): Promise<{ status: number; body: Buffer; type: string }> {
	return new Promise((resolve, reject) => {
		const req = request(
			`${API}${path}`,
			{
				agent: mtlsAgent(),
				headers: {
					authorization: `Bearer ${accessToken}`,
					'user-agent': UA,
					accept: 'application/json, application/pdf',
					'correlation-id': randomUUID(),
					'rd-is-pickup-station': 'false',
					'rd-is-lsfk': 'false'
				}
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c: Buffer) => chunks.push(c));
				res.on('end', () =>
					resolve({
						status: res.statusCode ?? 0,
						body: Buffer.concat(chunks),
						type: String(res.headers['content-type'] ?? '')
					})
				);
			}
		);
		req.on('error', reject);
		req.setTimeout(30_000, () => req.destroy(new Error('REWE API timeout')));
		req.end();
	});
}

export interface ReweEbonSummary {
	receiptId: string;
	receiptTimestamp: string;
	receiptTotalPrice: number;
	market?: { name?: string; city?: string; street?: string };
	cancelled?: boolean;
}

export async function reweListEbons(accessToken: string, page = 1): Promise<ReweEbonSummary[]> {
	const res = await apiGet(`/ebons?objectsPerPage=20&page=${page}`, accessToken);
	if (res.type.includes('html'))
		throw new Error('REWE API blocked (Cloudflare page instead of JSON)');
	if (res.status !== 200) throw new Error(`REWE /ebons: ${res.status}`);
	const json = JSON.parse(res.body.toString('utf8')) as {
		data?: { getEbons?: { items?: ReweEbonSummary[] } };
	};
	return json.data?.getEbons?.items ?? [];
}

export async function reweEbonPdf(accessToken: string, receiptId: string): Promise<Uint8Array> {
	const res = await apiGet(`/receipts/${encodeURIComponent(receiptId)}/pdf`, accessToken);
	if (res.status !== 200 || !res.body.subarray(0, 4).toString().startsWith('%PDF')) {
		throw new Error(`REWE PDF ${receiptId}: ${res.status}`);
	}
	return new Uint8Array(res.body);
}
