import { lt } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';

/** Expired sessions and invites are useless; deleting them keeps no stale secrets around. */
export async function deleteExpired() {
	const now = new Date();
	await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
	await db.delete(schema.invites).where(lt(schema.invites.expiresAt, now));
}
