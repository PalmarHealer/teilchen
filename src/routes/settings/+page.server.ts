import { fail } from '@sveltejs/kit';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { isLocale, LANG_COOKIE, type Locale } from '#lib/i18n/index.ts';
import { randomToken, sha256 } from '#lib/server/crypto.ts';
import { db, schema } from '#lib/server/db/index.ts';
import { optionalEnv } from '#lib/server/db/env.ts';
import { parseReceiptPdf } from '#lib/server/ebon/pdf.ts';
import { answerContactRequest, incomingContactRequests } from '#lib/server/domain.ts';
import { importEbon } from '#lib/server/receipts.ts';
import { isUuid } from '#lib/uuid.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	const inbox = optionalEnv('INBOX_ADDRESS');
	const [local, domain] = inbox?.split('@') ?? [];
	const pref = cookies.get(LANG_COOKIE);
	return {
		email: user.email,
		inboxAddress: local && domain ? `${local}+${user.inboxToken}@${domain}` : null,
		langPref: (isLocale(pref) ? pref : 'auto') as Locale | 'auto',
		requests: await incomingContactRequests(user.id),
		openInvites: await db.$count(
			schema.invites,
			and(ownContactInvites(user.id), gt(schema.invites.expiresAt, new Date()))
		)
	};
};

const MAX_UPLOAD_FILES = 20;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ownContactInvites = (me: string) =>
	and(eq(schema.invites.inviterId, me), isNull(schema.invites.groupId));

async function answer(me: string, request: Request, accept: boolean) {
	const from = (await request.formData()).get('from');
	if (!isUuid(from) || !(await answerContactRequest(me, from, accept)))
		return fail(400, { message: 'errors.requestGone' as const });
	return { answered: accept ? ('accepted' as const) : ('declined' as const) };
}

export const actions: Actions = {
	acceptContact: async ({ locals, request }) => answer(locals.user!.id, request, true),
	declineContact: async ({ locals, request }) => answer(locals.user!.id, request, false),

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

	upload: async ({ locals, request }) => {
		const files = (await request.formData()).getAll('pdf').filter((f) => f instanceof File);
		// Parsing a PDF is expensive; an eBon is a few kB, an online invoice a few hundred.
		if (files.length > MAX_UPLOAD_FILES || files.some((f) => f.size > MAX_UPLOAD_BYTES))
			return fail(400, { uploadError: 'errors.uploadTooLarge' as const });
		let imported = 0;
		for (const file of files) {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const bon = await parseReceiptPdf(bytes).catch(() => null);
			if (!bon) continue;
			const id = `upload:${sha256(Buffer.from(bytes).toString('base64'))}`;
			if (await importEbon(locals.user!.id, id, bon)) imported++;
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
	},

	revokeInvites: async ({ locals }) => {
		await db.delete(schema.invites).where(ownContactInvites(locals.user!.id));
		return { invitesRevoked: true };
	}
};
