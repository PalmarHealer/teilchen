import { error, fail } from '@sveltejs/kit';
import { translate } from '#lib/i18n/index.ts';
import { parseCents } from '#lib/money.ts';
import { personBalances, planPersonSettlement, withoutKept } from '#lib/ledger.ts';
import {
	answerContactRequest,
	contactStatuses,
	entriesFor,
	groupMatesOf,
	groupsOf,
	requestContact,
	settleWith,
	usersByIds
} from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const all = await entriesFor(me);
	// Visible for contacts, group mates and anyone I still share bookings with.
	const status = (await contactStatuses(me, [params.id])).get(params.id)!;
	const mates = await groupMatesOf(me);
	const sharesBookings = personBalances(me, all).has(params.id);
	const person = (await usersByIds([params.id])).get(params.id);
	if (!person || (status !== 'contact' && !mates.has(params.id) && !sharesBookings))
		error(404, 'errors.personNotFound');
	const groups = new Map((await groupsOf(me)).map((g) => [g.id, g]));
	const kept = new Set([...groups.values()].filter((g) => g.keepDebts).map((g) => g.id));
	const entries = withoutKept(all, kept);
	const balance = personBalances(me, entries).get(person.id);
	const keptBalance = personBalances(
		me,
		all.filter((e) => e.contextId && kept.has(e.contextId))
	).get(person.id);
	return {
		person,
		// A contact request is possible only with people I share a group with.
		contact: status === 'none' && !mates.has(params.id) ? ('unavailable' as const) : status,
		net: balance?.net ?? 0,
		// label null = direct; the page translates it
		contexts: [...(balance?.byContext ?? [])].map(([id, cents]) => ({
			key: id ?? 'direct',
			label: id ? (groups.get(id)?.name ?? null) : null,
			icon: id ? (groups.get(id)?.icon ?? 'users') : 'direct',
			cents
		})),
		// Settled inside the group, not part of the net above
		keptGroups: [...(keptBalance?.byContext ?? [])].map(([id, cents]) => ({
			id: id!,
			name: groups.get(id!)!.name,
			icon: groups.get(id!)!.icon,
			cents
		})),
		plan: planPersonSettlement(me, person.id, entries)
	};
};

export const actions: Actions = {
	requestContact: async ({ locals, params }) => {
		const me = locals.user!.id;
		if (!(await groupMatesOf(me)).has(params.id))
			return fail(403, { message: 'errors.unknownPerson' as const });
		return { contact: await requestContact(me, params.id) };
	},

	acceptContact: async ({ locals, params }) => {
		if (!(await answerContactRequest(locals.user!.id, params.id, true)))
			return fail(400, { message: 'errors.requestGone' as const });
		return { contact: 'connected' as const };
	},
	settle: async ({ locals, params, request }) => {
		// Empty = everything; a smaller amount is a partial payment.
		const raw = String((await request.formData()).get('amount') ?? '').trim();
		const cents = raw ? parseCents(raw) : undefined;
		if (cents === null || (cents !== undefined && cents <= 0))
			return fail(400, { message: 'errors.invalidAmount' as const });
		const title = translate(locals.locale, 'expenses.settlementTitle');
		const plan = await settleWith(locals.user!.id, params.id, title, { cents });
		if (!plan.lines.length) return fail(400, { message: 'errors.nothingToSettle' as const });
		return { settled: plan.transfer?.cents ?? 0 };
	}
};
