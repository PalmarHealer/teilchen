import { error, fail } from '@sveltejs/kit';
import { personBalances, planPersonSettlement } from '#lib/ledger.ts';
import { contactsOf, entriesFor, groupsOf, settleWith } from '#lib/server/domain.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const person = (await contactsOf(me)).find((c) => c.id === params.id);
	if (!person) error(404, 'Person nicht gefunden');
	const entries = await entriesFor(me);
	const balance = personBalances(me, entries).get(person.id);
	const groups = new Map((await groupsOf(me)).map((g) => [g.id, g]));
	return {
		person,
		net: balance?.net ?? 0,
		contexts: [...(balance?.byContext ?? [])].map(([id, cents]) => ({
			label: id ? (groups.get(id)?.name ?? 'Gruppe') : 'Direkt',
			icon: id ? (groups.get(id)?.icon ?? 'users') : 'direct',
			cents
		})),
		plan: planPersonSettlement(me, person.id, entries)
	};
};

export const actions: Actions = {
	settle: async ({ locals, params }) => {
		const plan = await settleWith(locals.user!.id, params.id);
		if (!plan.lines.length) return fail(400, { message: 'Nichts zu verrechnen' });
		return { settled: plan.transfer?.cents ?? 0 };
	}
};
