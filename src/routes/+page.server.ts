import { personBalances } from '#lib/ledger.ts';
import { entriesFor, recentExpenses, usersByIds } from '#lib/server/domain.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const balances = personBalances(me, await entriesFor(me));
	const people = await usersByIds([...balances.keys()]);
	const rows = [...balances]
		.map(([id, b]) => ({ user: people.get(id)!, net: b.net, contexts: b.byContext.size }))
		.filter((r) => r.user && r.net !== 0)
		.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
	return {
		people: rows,
		owedToMe: rows.filter((r) => r.net > 0).reduce((a, r) => a + r.net, 0),
		iOwe: rows.filter((r) => r.net < 0).reduce((a, r) => a - r.net, 0),
		recent: await recentExpenses(me, undefined, 8)
	};
};
