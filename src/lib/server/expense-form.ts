import { z } from 'zod';
import type { MessageKey } from '../i18n/index.ts';
import { allocate, parseCents, type Cents } from '../money.ts';
import { UUID_SOURCE } from '../uuid.ts';
import { contactsOf, groupMemberIds, groupsOf, usersByIds } from './domain.ts';
import { isIcon } from './tabler.ts';

/**
 * What the expense form needs to offer: contacts (for direct expenses) and groups with their
 * members' names (members need not be contacts).
 */
export async function expenseFormOptions(me: string) {
	const groups = await Promise.all(
		(await groupsOf(me)).map(async (g) => ({ ...g, memberIds: await groupMemberIds(g.id) }))
	);
	const names = await usersByIds([...new Set(groups.flatMap((g) => g.memberIds))]);
	return {
		contacts: await contactsOf(me),
		groups: groups.map((g) => ({
			...g,
			members: g.memberIds.map((id) => ({ id, name: names.get(id)?.name ?? '?' }))
		}))
	};
}

const Input = z.object({
	title: z.string().trim().min(1, 'errors.titleMissing').max(120),
	amount: z.string(),
	context: z.string().regex(new RegExp(`^(direct|group:${UUID_SOURCE})$`)),
	payer: z.string().uuid(),
	participants: z.array(z.string().uuid()).min(1, 'errors.atLeastOne'),
	mode: z.enum(['equal', 'exact']),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type ParsedExpense =
	| {
			ok: true;
			groupId: string | null;
			payerId: string;
			title: string;
			icon: string | null;
			shares: Map<string, Cents>;
			spentAt: Date;
			people: string[];
	  }
	| { ok: false; status: 400 | 403; message: MessageKey };

/** Validates the expense form (used by "new" and "edit") against what `me` may book. */
export async function parseExpenseForm(fd: FormData, me: string): Promise<ParsedExpense> {
	const bad = (message: MessageKey, status: 400 | 403 = 400) =>
		({ ok: false, status, message }) as const;
	const parsed = Input.safeParse({
		title: fd.get('title'),
		amount: fd.get('amount'),
		context: fd.get('context'),
		payer: fd.get('payer'),
		participants: fd.getAll('participants'),
		mode: fd.get('mode'),
		date: fd.get('date')
	});
	if (!parsed.success) {
		const msg = parsed.error.issues[0]!.message;
		return bad((msg.startsWith('errors.') ? msg : 'errors.invalidInput') as MessageKey);
	}
	const v = parsed.data;
	const spentAt = new Date(`${v.date}T12:00:00`);
	// "2025-02-30" passes the pattern but is no date (Date would roll it over to March).
	if (Number.isNaN(spentAt.getTime()) || spentAt.toISOString().slice(0, 10) !== v.date)
		return bad('errors.invalidDate');
	const amount = parseCents(v.amount);
	if (!amount || amount <= 0) return bad('errors.invalidAmount');

	// Who may appear in this context?
	let groupId: string | null = null;
	let allowed: Set<string>;
	if (v.context.startsWith('group:')) {
		groupId = v.context.slice(6);
		allowed = new Set(await groupMemberIds(groupId));
		if (!allowed.has(me)) return bad('errors.notYourGroup', 403);
	} else {
		allowed = new Set([me, ...(await contactsOf(me)).map((c) => c.id)]);
	}
	const people = [...new Set(v.participants)];
	if (![v.payer, ...people].every((p) => allowed.has(p))) return bad('errors.unknownPerson', 403);
	if (!groupId && !people.concat(v.payer).includes(me)) return bad('errors.directMustIncludeYou');

	let shares: Map<string, Cents>;
	if (v.mode === 'equal') {
		shares = new Map(
			allocate(
				amount,
				people.map(() => 1)
			).map((c, i) => [people[i]!, c])
		);
	} else {
		shares = new Map();
		for (const p of people) {
			const c = parseCents(String(fd.get(`exact_${p}`) ?? '0'));
			if (c === null || c < 0) return bad('errors.invalidShare');
			shares.set(p, c);
		}
		const sum = [...shares.values()].reduce((a, b) => a + b, 0);
		if (sum !== amount) return bad('errors.sharesMismatch');
	}

	return {
		ok: true,
		groupId,
		payerId: v.payer,
		title: v.title,
		icon: isIcon(fd.get('icon')) ? (fd.get('icon') as string) : null,
		shares,
		spentAt,
		people
	};
}
