import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { encrypt, randomToken, sha256 } from '#lib/server/crypto.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { optionalEnv } from '#lib/server/db/env.ts';
import { parseEbonPdf } from '#lib/server/ebon/pdf.ts';
import { importEbon } from '#lib/server/receipts.ts';
import { reweAuthStart, reweExchangeCode } from '#lib/server/rewe/client.ts';
import type { Actions, PageServerLoad } from './$types';

const VERIFIER_COOKIE = 'rewe_pkce';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const [rewe] = await db
		.select({
			lastSyncAt: schema.reweAccounts.lastSyncAt,
			lastError: schema.reweAccounts.lastError
		})
		.from(schema.reweAccounts)
		.where(eq(schema.reweAccounts.userId, user.id));
	const inbox = optionalEnv('INBOX_ADDRESS');
	const [local, domain] = inbox?.split('@') ?? [];
	return {
		email: user.email,
		inboxAddress: local && domain ? `${local}+${user.inboxToken}@${domain}` : null,
		rewe: rewe ?? null
	};
};

export const actions: Actions = {
	reweStart: async ({ cookies }) => {
		const { url, verifier } = await reweAuthStart();
		cookies.set(VERIFIER_COOKIE, verifier, {
			path: '/einstellungen',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 900
		});
		return { reweAuthUrl: url };
	},

	reweFinish: async ({ cookies, locals, request }) => {
		const verifier = cookies.get(VERIFIER_COOKIE);
		if (!verifier) return fail(400, { reweError: 'Anmeldung abgelaufen, bitte neu starten' });
		const pasted = String((await request.formData()).get('redirect') ?? '');
		try {
			const tokens = await reweExchangeCode(pasted, verifier);
			const tokensEnc = encrypt(JSON.stringify(tokens));
			await db
				.insert(schema.reweAccounts)
				.values({ userId: locals.user!.id, tokensEnc })
				.onConflictDoUpdate({
					target: schema.reweAccounts.userId,
					set: { tokensEnc, enabled: true, lastError: null }
				});
		} catch (e) {
			return fail(400, { reweError: e instanceof Error ? e.message : 'Verbindung fehlgeschlagen' });
		}
		cookies.delete(VERIFIER_COOKIE, { path: '/einstellungen' });
		return { reweConnected: true };
	},

	reweDisconnect: async ({ locals }) => {
		await db.delete(schema.reweAccounts).where(eq(schema.reweAccounts.userId, locals.user!.id));
	},

	upload: async ({ locals, request }) => {
		const files = (await request.formData()).getAll('pdf').filter((f) => f instanceof File);
		let imported = 0;
		for (const file of files) {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const bon = await parseEbonPdf(bytes).catch(() => null);
			if (!bon) continue;
			const id = `upload:${sha256(Buffer.from(bytes).toString('base64'))}`;
			if (await importEbon(locals.user!.id, 'ebon_mail', id, bon)) imported++;
		}
		if (!imported) return fail(400, { uploadError: 'Kein neuer REWE-eBon erkannt' });
		return { imported };
	},

	invite: async ({ locals, url }) => {
		const token = randomToken(12);
		await db.insert(schema.invites).values({
			token,
			inviterId: locals.user!.id,
			expiresAt: new Date(Date.now() + 7 * 864e5)
		});
		return { inviteUrl: new URL(`/einladung/${token}`, url.origin).toString() };
	}
};
