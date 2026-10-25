import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { allocate, parseCents } from '#lib/money.ts';
import {
	connect,
	contactsOf,
	createExpense,
	groupMemberIds,
	groupsOf
} from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!.id;
	const groups = await Promise.all(
		(await groupsOf(me)).map(async (g) => ({ ...g, memberIds: await groupMemberIds(g.id) }))
	);
	return {
		contacts: await contactsOf(me),
		groups,
		preset: {
			person: url.searchParams.get('person'),
			group: url.searchParams.get('group')
		}
	};
};

const Input = z.object({
	title: z.string().trim().min(1, 'Titel fehlt').max(120),
	amount: z.string(),
	context: z.string().regex(/^(direct|group:[0-9a-f-]{36})$/),
	payer: z.string().uuid(),
	participants: z.array(z.string().uuid()).min(1, 'Mindestens eine Person auswählen'),
	mode: z.enum(['equal', 'exact']),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const me = locals.user!.id;
		const fd = await request.formData();
		const parsed = Input.safeParse({
			title: fd.get('title'),
			amount: fd.get('amount'),
			context: fd.get('context'),
			payer: fd.get('payer'),
			participants: fd.getAll('participants'),
			mode: fd.get('mode'),
			date: fd.get('date')
		});
		if (!parsed.success) return fail(400, { message: parsed.error.issues[0]!.message });
		const v = parsed.data;
		const amount = parseCents(v.amount);
		if (!amount || amount <= 0) return fail(400, { message: 'Betrag ungültig' });

		// Wer darf in diesem Kontext vorkommen?
		let groupId: string | null = null;
		let allowed: Set<string>;
		if (v.context.startsWith('group:')) {
			groupId = v.context.slice(6);
			allowed = new Set(await groupMemberIds(groupId));
			if (!allowed.has(me)) return fail(403, { message: 'Keine Gruppe von dir' });
		} else {
			allowed = new Set([me, ...(await contactsOf(me)).map((c) => c.id)]);
		}
		const people = [...new Set(v.participants)];
		if (![v.payer, ...people].every((p) => allowed.has(p)))
			return fail(403, { message: 'Unbekannte Person' });
		if (!groupId && !people.concat(v.payer).includes(me))
			return fail(400, { message: 'Direkte Ausgaben müssen dich betreffen' });

		let shares: Map<string, number>;
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
				if (c === null || c < 0) return fail(400, { message: 'Einzelbetrag ungültig' });
				shares.set(p, c);
			}
			const sum = [...shares.values()].reduce((a, b) => a + b, 0);
			if (sum !== amount) return fail(400, { message: 'Einzelbeträge ergeben nicht die Summe' });
		}

		await createExpense({
			groupId,
			payerId: v.payer,
			createdBy: me,
			title: v.title,
			shares,
			spentAt: new Date(`${v.date}T12:00:00`)
		});
		if (!groupId) for (const p of people) await connect(me, p);
		redirect(303, groupId ? `/gruppen/${groupId}` : '/');
	}
};
