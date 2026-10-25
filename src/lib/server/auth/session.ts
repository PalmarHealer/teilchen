import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { randomToken, sha256 } from '../crypto';
import { db, schema } from '../db';

export const SESSION_COOKIE = 'teilchen_session';
const MAX_AGE_DAYS = 60;

export async function createSession(cookies: Cookies, userId: string) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5);
	await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export async function userFromSession(token: string | undefined) {
	if (!token) return null;
	const [row] = await db
		.select({ user: schema.users })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
		.where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())));
	return row?.user ?? null;
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
