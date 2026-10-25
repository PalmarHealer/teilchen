import { error, fail } from '@sveltejs/kit';
import { translate } from '#lib/i18n/index.ts';
import { personBalances, planPersonSettlement, withoutKept } from '#lib/ledger.ts';
import { contactsOf, entriesFor, groupsOf, settleWith } from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const person = (await contactsOf(me)).find((c) => c.id === params.id);
	if (!person) error(404, 'errors.personNotFound');
	const groups = new Map((await groupsOf(me)).map((g) => [g.id, g]));
	const kept = new Set([...groups.values()].filter((g) => g.keepDebts).map((g) => g.id));
	const all = await entriesFor(me);
	const entries = withoutKept(all, kept);
	const balance = personBalances(me, entries).get(person.id);
	const keptBalance = personBalances(
		me,
		all.filter((e) => e.contextId && kept.has(e.contextId))
	).get(person.id);
	return {
		person,
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
	settle: async ({ locals, params }) => {
		const title = translate(locals.locale, 'expenses.settlementTitle');
		const plan = await settleWith(locals.user!.id, params.id, title);
		if (!plan.lines.length) return fail(400, { message: 'errors.nothingToSettle' as const });
		return { settled: plan.transfer?.cents ?? 0 };
	}
};
