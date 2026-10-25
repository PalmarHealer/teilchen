import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isLocale, LANG_COOKIE, type MessageKey } from '#lib/i18n/index.ts';
import { encrypt, randomToken, sha256 } from '#lib/server/crypto.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { optionalEnv } from '#lib/server/db/env.ts';
import { parseEbonPdf } from '#lib/server/ebon/pdf.ts';
import { importEbon } from '#lib/server/receipts.ts';
import {
	pastedRedirectProblem,
	reweAuthStart,
	reweAuthUrl,
	reweAvailable,
	reweExchangeCode
} from '#lib/server/rewe/client.ts';
import type { Actions, PageServerLoad } from './$types';

const VERIFIER_COOKIE = 'rewe_pkce';

export const load: PageServerLoad = async ({ locals, cookies }) => {
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
	const pref = cookies.get(LANG_COOKIE);
	return {
		email: user.email,
		inboxAddress: local && domain ? `${local}+${user.inboxToken}@${domain}` : null,
		rewe: rewe ?? null,
		reweAvailable: reweAvailable(),
		langPref: isLocale(pref) ? pref : 'auto'
	};
};

export const actions: Actions = {
	language: async ({ cookies, request }) => {
		const lang = (await request.formData()).get('lang');
		if (isLocale(lang)) {
			cookies.set(LANG_COOKIE, lang, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 365 * 86400
			});
		} else {
			cookies.delete(LANG_COOKIE, { path: '/' });
		}
	},

	reweStart: async ({ cookies }) => {
		if (!reweAvailable()) return fail(400, { reweError: 'errors.reweFailed' as const });
		const { url, verifier } = await reweAuthStart();
		cookies.set(VERIFIER_COOKIE, verifier, {
			path: '/settings',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 900
		});
		return { reweAuthUrl: url };
	},

	reweFinish: async ({ cookies, locals, request }) => {
		const verifier = cookies.get(VERIFIER_COOKIE);
		if (!verifier) return fail(400, { reweError: 'errors.reweLoginExpired' as const });
		const pasted = String((await request.formData()).get('redirect') ?? '');
		const problem = pastedRedirectProblem(pasted);
		// Keep the sign-in link on screen so the user can retry with the same verifier.
		const retry = async (reweError: MessageKey) =>
			fail(400, { reweError, reweAuthUrl: await reweAuthUrl(verifier) });
		if (problem === 'wrongUrl') return retry('errors.reweWrongUrl');
		if (problem === 'noCode') return retry('errors.reweNoCode');
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
			console.error('[rewe connect]', e);
			return retry('errors.reweFailed');
		}
		cookies.delete(VERIFIER_COOKIE, { path: '/settings' });
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
		if (!imported) return fail(400, { uploadError: 'errors.noNewEbon' as const });
		return { imported };
	},

	invite: async ({ locals, url }) => {
		const token = randomToken(12);
		await db.insert(schema.invites).values({
			token,
			inviterId: locals.user!.id,
			expiresAt: new Date(Date.now() + 7 * 864e5)
		});
		return { inviteUrl: new URL(`/invite/${token}`, url.origin).toString() };
	}
};
