import { personBalances, withoutKept } from '#lib/ledger.ts';
import {
	entriesFor,
	keptBalances,
	keptGroupIds,
	recentExpenses,
	usersByIds
} from '#lib/server/domain.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const all = await entriesFor(me);
	const kept = await keptGroupIds(me);
	// Groups that keep their debts are settled there, so they don't count into a person's net …
	const balances = personBalances(me, withoutKept(all, kept));
	const people = await usersByIds([...balances.keys()]);
	const rows = [...balances]
		.map(([id, b]) => ({ user: people.get(id)!, net: b.net, contexts: b.byContext.size }))
		.filter((r) => r.user && r.net !== 0)
		.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
	// … but they still belong in what I get and owe overall.
	const inKept = await keptBalances(me, kept);
	const open = [
		...rows.map((r) => r.net),
		...[...inKept.values()].flatMap((b) => [...b.byContext.values()])
	];
	return {
		people: rows,
		owedToMe: open.filter((c) => c > 0).reduce((a, c) => a + c, 0),
		iOwe: open.filter((c) => c < 0).reduce((a, c) => a - c, 0),
		recent: await recentExpenses(me, undefined, 8)
	};
};
