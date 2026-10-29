import { eq, sql } from 'drizzle-orm';
import { ImapFlow } from 'imapflow';
import { simpleParser, type Attachment, type ParsedMail } from 'mailparser';
import { db, schema } from '#lib/server/db/index.ts';
import { env, optionalEnv } from '#lib/server/db/env.ts';
import { parseReceiptPdf } from '#lib/server/ebon/pdf.ts';
import { looksLikeEbon } from '#lib/server/ebon/classify.ts';
import { dmarcVerifiedDomain, envelopeAddresses } from '#lib/server/ebon/sender.ts';
import { importEbon } from '#lib/server/receipts.ts';

/** Mails that could not be processed; kept for inspection, then purged. */
const FAILED = 'Failed';
/** Counted from delivery (MOVE keeps INTERNALDATE), so it must exceed GIVE_UP_AFTER_DAYS. */
const FAILED_RETENTION_DAYS = 14;
/** A mail that keeps failing for transient reasons (DB, network) is given up after this. */
const GIVE_UP_AFTER_DAYS = 3;

/** The mail itself is unusable (unparseable mail or PDF): retrying cannot help. */
class BrokenMail extends Error {}

/**
 * Imports REWE eBons from the shared inbox without letting it fill up:
 * - mails that are not eBons (e.g. forwarded login codes) are deleted silently
 * - handled mails are deleted (outcome in inbound_mails)
 * - broken mails move to FAILED right away
 * - transient errors leave the mail in INBOX for the next poll, until GIVE_UP_AFTER_DAYS
 * - FAILED is purged after FAILED_RETENTION_DAYS
 */
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
	try {
		if (!(await imap.list()).some((box) => box.path === FAILED)) await imap.mailboxCreate(FAILED);
		await drainInbox(imap);
		await purgeFailed(imap);
	} finally {
		await imap.logout();
	}
}

async function drainInbox(imap: ImapFlow) {
	const lock = await imap.getMailboxLock('INBOX');
	try {
		// All mails, not just unseen ones: someone may have opened one in a mail client.
		const uids = (await imap.search({ all: true }, { uid: true })) || [];
		for (const uid of uids) {
			let received: Date | undefined;
			try {
				const msg = await imap.fetchOne(
					String(uid),
					{ source: true, internalDate: true },
					{ uid: true }
				);
				if (!msg || !msg.source) continue;
				received = msg.internalDate ? new Date(msg.internalDate) : undefined;
				const mail = await simpleParser(msg.source).catch((e: unknown) => {
					throw new BrokenMail(`unparseable mail: ${String(e)}`);
				});
				await handleMail(mail);
				await imap.messageDelete(String(uid), { uid: true });
			} catch (e) {
				const tooOld = received && Date.now() - received.getTime() > GIVE_UP_AFTER_DAYS * 864e5;
				if (!(e instanceof BrokenMail) && !tooOld) {
					console.warn('[mail] transient failure, retrying next poll:', uid, e);
					continue;
				}
				console.error('[mail] giving up, moving to', FAILED, uid, e);
				await imap
					.messageMove(String(uid), FAILED, { uid: true })
					.catch((moveError: unknown) => console.error('[mail] move failed', uid, moveError));
			}
		}
	} finally {
		lock.release();
	}
}

async function purgeFailed(imap: ImapFlow) {
	const lock = await imap.getMailboxLock(FAILED);
	try {
		const before = new Date(Date.now() - FAILED_RETENTION_DAYS * 864e5);
		const old = (await imap.search({ before }, { uid: true })) || [];
		if (old.length) await imap.messageDelete(old, { uid: true });
	} finally {
		lock.release();
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

	// Forwarding rules also catch login codes and the like: drop those silently and log nothing
	// about their content.
	const { pdfs, texts } = await collect(mail);
	if (!looksLikeEbon({ texts, pdfNames: pdfs.map((p) => p.filename ?? 'attachment.pdf') }))
		return log('ignored');
	if (!user) return log('unknown_user', addresses(mail).join(', '));

	let imported = 0;
	for (const [i, pdf] of pdfs.entries()) {
		const bon = await parseReceiptPdf(new Uint8Array(pdf.content)).catch((e: unknown) => {
			throw new BrokenMail(`unreadable PDF ${pdf.filename ?? i}: ${String(e)}`);
		});
		if (!bon) continue;
		const externalId = `mail:${bon.number ?? messageId}:${bon.purchasedAt.toISOString()}:${i}`;
		if (await importEbon(user.id, externalId, bon)) imported++;
	}
	return log(imported ? 'imported' : 'no_ebon', `${imported}/${pdfs.length}`);
}

/**
 * PDFs plus the texts that tell whether this is an eBon. Forwarded mails may carry the original
 * as a message/rfc822 attachment; an unparseable one is skipped (it can't be classified anyway).
 */
async function collect(
	mail: ParsedMail,
	depth = 0
): Promise<{ pdfs: Attachment[]; texts: (string | undefined)[] }> {
	const pdfs: Attachment[] = [];
	const texts = [mail.subject, mail.from?.text, mail.text];
	for (const a of mail.attachments) {
		if (a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'))
			pdfs.push(a);
		else if (a.contentType === 'message/rfc822' && depth < 3) {
			const inner = await simpleParser(a.content).catch(() => null);
			if (!inner) continue;
			const nested = await collect(inner, depth + 1);
			pdfs.push(...nested.pdfs);
			texts.push(...nested.texts);
		}
	}
	return { pdfs, texts };
}

function addresses(mail: ParsedMail): string[] {
	const list = [mail.to, mail.cc, mail.from]
		.flat()
		.flatMap((a) => a?.value ?? [])
		.map((v) => v.address?.toLowerCase() ?? '');
	return [...new Set([...list, ...envelopeAddresses(mail.headerLines)])].filter(Boolean);
}

/**
 * Matching: first via teilchen+<token>@…, otherwise via the sender address (= whoever forwarded
 * it). The sender counts only if our mail server verified it with DMARC, and only if exactly one
 * user has that address (emails come from the identity provider and need not be unique).
 */
async function findUser(mail: ParsedMail) {
	for (const addr of addresses(mail)) {
		const token = addr.match(/\+([a-z0-9]+)@/)?.[1];
		if (!token) continue;
		const [u] = await db.select().from(schema.users).where(eq(schema.users.inboxToken, token));
		if (u) return u;
	}
	const from = mail.from?.value[0]?.address?.toLowerCase();
	const authservId = optionalEnv('MAIL_AUTHSERV_ID') ?? env('IMAP_HOST');
	if (!from || from.split('@')[1] !== dmarcVerifiedDomain(mail.headerLines, authservId))
		return null;
	const users = await db
		.select()
		.from(schema.users)
		.where(eq(sql`lower(${schema.users.email})`, from))
		.limit(2);
	return users.length === 1 ? users[0]! : null;
}
