import { eq, sql } from 'drizzle-orm';
import { ImapFlow } from 'imapflow';
import { simpleParser, type Attachment, type ParsedMail } from 'mailparser';
import { db, schema } from '#lib/server/db/index.ts';
import { env, optionalEnv } from '#lib/server/db/env.ts';
import { parseEbonPdf } from '#lib/server/ebon/pdf.ts';
import { importEbon } from '#lib/server/receipts.ts';

/** Liest neue Mails im eBon-Postfach und importiert angehängte REWE-eBons. */
export async function pollMailbox() {
	if (!optionalEnv('IMAP_HOST')) return;
	const imap = new ImapFlow({
		host: env('IMAP_HOST'),
		port: Number(optionalEnv('IMAP_PORT') ?? 993),
		secure: true,
		auth: { user: env('IMAP_USER'), pass: env('IMAP_PASSWORD') },
		logger: false
	});
	await imap.connect();
	const lock = await imap.getMailboxLock('INBOX');
	try {
		const uids = (await imap.search({ seen: false }, { uid: true })) || [];
		for (const uid of uids) {
			const msg = await imap.fetchOne(String(uid), { source: true }, { uid: true });
			if (msg && msg.source) await handleMail(await simpleParser(msg.source));
			await imap.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
		}
	} finally {
		lock.release();
		await imap.logout();
	}
}

async function handleMail(mail: ParsedMail) {
	const messageId = mail.messageId ?? `${mail.date?.toISOString()}-${mail.subject}`;
	const user = await findUser(mail);
	const log = (status: string, detail?: string) =>
		db
			.insert(schema.inboundMails)
			.values({ messageId, userId: user?.id, status, detail })
			.onConflictDoNothing();

	if (!user) return log('unknown_user', addresses(mail).join(', '));

	const pdfs = await collectPdfs(mail.attachments);
	if (!pdfs.length) return log('no_pdf', mail.subject);

	let imported = 0;
	for (const [i, pdf] of pdfs.entries()) {
		const bon = await parseEbonPdf(new Uint8Array(pdf.content));
		if (!bon) continue;
		const externalId = `mail:${bon.bonNr ?? messageId}:${bon.purchasedAt.toISOString()}:${i}`;
		if (await importEbon(user.id, 'ebon_mail', externalId, bon)) imported++;
	}
	return log(imported ? 'imported' : 'no_ebon', `${imported}/${pdfs.length}`);
}

/** Weitergeleitete Mails können das Original als message/rfc822-Anhang enthalten. */
async function collectPdfs(attachments: Attachment[], depth = 0): Promise<Attachment[]> {
	const out: Attachment[] = [];
	for (const a of attachments) {
		if (a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'))
			out.push(a);
		else if (a.contentType === 'message/rfc822' && depth < 3) {
			out.push(...(await collectPdfs((await simpleParser(a.content)).attachments, depth + 1)));
		}
	}
	return out;
}

function addresses(mail: ParsedMail): string[] {
	const list = [mail.to, mail.cc, mail.from]
		.flat()
		.flatMap((a) => a?.value ?? [])
		.map((v) => v.address?.toLowerCase() ?? '');
	for (const h of ['delivered-to', 'x-original-to']) {
		const v = mail.headers.get(h);
		if (typeof v === 'string') list.push(v.toLowerCase());
	}
	return list.filter(Boolean);
}

/** Zuordnung: zuerst über teilchen+<token>@…, sonst über die Absenderadresse (= Weiterleitung). */
async function findUser(mail: ParsedMail) {
	for (const addr of addresses(mail)) {
		const token = addr.match(/\+([a-z0-9]+)@/)?.[1];
		if (!token) continue;
		const [u] = await db.select().from(schema.users).where(eq(schema.users.inboxToken, token));
		if (u) return u;
	}
	const from = mail.from?.value[0]?.address?.toLowerCase();
	if (!from) return null;
	const [u] = await db
		.select()
		.from(schema.users)
		.where(eq(sql`lower(${schema.users.email})`, from));
	return u ?? null;
}
