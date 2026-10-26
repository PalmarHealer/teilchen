import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt, lt } from 'drizzle-orm';
import * as client from 'openid-client';
import { randomToken, sha256 } from '../crypto';
import { db, schema } from '../db';
import { oidc } from './oidc';

export const SESSION_COOKIE = 'teilchen_session';
const MAX_AGE_DAYS = 60;
/** Without a refresh token the account can't be re-checked, so such a session ends sooner. */
const UNCHECKED_MAX_AGE_DAYS = 7;
/** How often a session asks the identity provider whether the account is still active. */
const RECHECK_MS = 60 * 60_000;

export async function createSession(cookies: Cookies, userId: string, refreshToken?: string) {
	const token = randomToken();
	const days = refreshToken ? MAX_AGE_DAYS : UNCHECKED_MAX_AGE_DAYS;
	const expiresAt = new Date(Date.now() + days * 864e5);
	await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, refreshToken });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export async function userFromSession(token: string | undefined) {
	if (!token) return null;
	const id = sha256(token);
	const [row] = await db
		.select({ user: schema.users, session: schema.sessions })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
		.where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())));
	if (!row) return null;
	if (!(await stillValid(row.session))) {
		await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
		return null;
	}
	return row.user;
}

/**
 * A session outlives a login, so it must notice when the account is disabled or loses access in
 * the identity provider: once an hour the refresh token is used. Only a rejected token ends the
 * session; if the provider is unreachable, the session goes on and is checked again later.
 */
async function stillValid(session: typeof schema.sessions.$inferSelect): Promise<boolean> {
	if (!session.refreshToken || Date.now() - session.checkedAt.getTime() < RECHECK_MS) return true;
	// Parallel requests of one page share the session: only the one that claims the check runs it
	// (refresh tokens rotate, a second use of the old one would fail).
	const [claimed] = await db
		.update(schema.sessions)
		.set({ checkedAt: new Date() })
		.where(
			and(
				eq(schema.sessions.id, session.id),
				lt(schema.sessions.checkedAt, new Date(Date.now() - RECHECK_MS))
			)
		)
		.returning({ id: schema.sessions.id });
	if (!claimed) return true;
	try {
		const tokens = await client.refreshTokenGrant(await oidc(), session.refreshToken);
		if (tokens.refresh_token && tokens.refresh_token !== session.refreshToken) {
			await db
				.update(schema.sessions)
				.set({ refreshToken: tokens.refresh_token })
				.where(eq(schema.sessions.id, session.id));
		}
		return true;
	} catch (e) {
		if (e instanceof client.ResponseBodyError && e.error === 'invalid_grant') return false;
		console.warn('[session] could not re-check the account, trying again later:', e);
		return true;
	}
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
