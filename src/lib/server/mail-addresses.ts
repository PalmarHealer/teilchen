import { and, eq, gt, isNotNull, isNull, ne, or } from 'drizzle-orm';
import { translate, type Locale } from '#lib/i18n/index.ts';
import { randomToken, sha256 } from './crypto.ts';
import { db, schema } from './db/index.ts';
import { optionalEnv } from './db/env.ts';
import { sendMail } from './smtp.ts';

const { mailAddresses } = schema;

/** Per user, confirmed or not: each one costs a mail to someone. */
export const MAX_ADDRESSES = 5;
const CONFIRM_DAYS = 7;
/** Asking again for the same address within this sends no second mail. */
const RESEND_AFTER_MS = 10 * 60_000;

const pending = () => gt(mailAddresses.createdAt, new Date(Date.now() - CONFIRM_DAYS * 864e5));

export async function addressesOf(userId: string) {
	return db
		.select({ address: mailAddresses.address, confirmed: isNotNull(mailAddresses.confirmedAt) })
		.from(mailAddresses)
		.where(
			and(eq(mailAddresses.userId, userId), or(isNotNull(mailAddresses.confirmedAt), pending()))
		)
		.orderBy(mailAddresses.address)
		.then((rows) => rows.map((r) => ({ ...r, confirmed: Boolean(r.confirmed) })));
}

/**
 * Mails a confirmation link to `address`. The address counts for matching only once the link is
 * opened by the same account, so nobody can claim someone else's mailbox.
 */
export async function requestAddress(
	user: { id: string; name: string },
	address: string,
	origin: string,
	locale: Locale
) {
	const inboxDomain = optionalEnv('INBOX_ADDRESS')?.split('@')[1]?.toLowerCase();
	if (address.split('@')[1] === inboxDomain) return 'errors.addressIsInbox' as const;
	const [taken] = await db
		.select({ userId: mailAddresses.userId })
		.from(mailAddresses)
		.where(and(eq(mailAddresses.address, address), isNotNull(mailAddresses.confirmedAt)));
	if (taken) return taken.userId === user.id ? null : ('errors.addressTaken' as const);
	const [mine] = await db
		.select()
		.from(mailAddresses)
		.where(and(eq(mailAddresses.address, address), eq(mailAddresses.userId, user.id)));
	if (mine && Date.now() - mine.createdAt.getTime() < RESEND_AFTER_MS) return null;
	if (!mine && (await addressesOf(user.id)).length >= MAX_ADDRESSES)
		return 'errors.tooManyAddresses' as const;

	const token = randomToken();
	const row = { address, userId: user.id, tokenHash: sha256(token), createdAt: new Date() };
	await db
		.insert(mailAddresses)
		.values(row)
		.onConflictDoUpdate({ target: [mailAddresses.address, mailAddresses.userId], set: row });
	const vars = { name: user.name, address, url: new URL(`/mail-address/${token}`, origin).href };
	await sendMail({
		to: address,
		subject: translate(locale, 'mailAddress.mailSubject'),
		text: translate(locale, 'mailAddress.mailText', vars)
	});
	return null;
}

/** The unconfirmed address behind a link, if it is still valid and was asked for by `userId`. */
export async function pendingAddress(token: string, userId: string) {
	const [row] = await db
		.select({ address: mailAddresses.address })
		.from(mailAddresses)
		.where(
			and(
				eq(mailAddresses.tokenHash, sha256(token)),
				eq(mailAddresses.userId, userId),
				isNull(mailAddresses.confirmedAt),
				pending()
			)
		);
	return row?.address ?? null;
}

export async function confirmAddress(token: string, userId: string) {
	const address = await pendingAddress(token, userId);
	if (!address) return false;
	return db.transaction(async (tx) => {
		const [taken] = await tx
			.select()
			.from(mailAddresses)
			.where(and(eq(mailAddresses.address, address), isNotNull(mailAddresses.confirmedAt)));
		if (taken) return false;
		await tx
			.update(mailAddresses)
			.set({ confirmedAt: new Date(), tokenHash: null })
			.where(and(eq(mailAddresses.address, address), eq(mailAddresses.userId, userId)));
		// Other people's requests for it can never be confirmed now
		await tx
			.delete(mailAddresses)
			.where(and(eq(mailAddresses.address, address), ne(mailAddresses.userId, userId)));
		return true;
	});
}

export async function removeAddress(userId: string, address: string) {
	await db
		.delete(mailAddresses)
		.where(and(eq(mailAddresses.address, address), eq(mailAddresses.userId, userId)));
}

/** Who confirmed one of these addresses (the first one that matches). */
export async function userByConfirmedAddress(addresses: string[]) {
	for (const address of addresses) {
		const [row] = await db
			.select({ user: schema.users })
			.from(mailAddresses)
			.innerJoin(schema.users, eq(schema.users.id, mailAddresses.userId))
			.where(and(eq(mailAddresses.address, address), isNotNull(mailAddresses.confirmedAt)));
		if (row) return row.user;
	}
	return null;
}
