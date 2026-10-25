import { allocate, type Cents } from './money';

export type Decision = 'mine' | 'shared' | 'theirs';

/**
 * Receipt items → share per person.
 * mine = only me; shared = everyone equally; theirs = everyone except me equally.
 */
export function sharesFromItems(
	me: string,
	participants: string[],
	items: { totalCents: Cents; decision: Decision }[]
): Map<string, Cents> {
	const everyone = participants.includes(me) ? participants : [me, ...participants];
	const others = everyone.filter((p) => p !== me);
	const shares = new Map<string, Cents>(everyone.map((p) => [p, 0]));
	const add = (people: string[], cents: Cents) =>
		allocate(
			cents,
			people.map(() => 1)
		).forEach((c, i) => {
			shares.set(people[i]!, shares.get(people[i]!)! + c);
		});
	for (const it of items) {
		if (it.decision === 'mine' || others.length === 0) add([me], it.totalCents);
		else if (it.decision === 'shared') add(everyone, it.totalCents);
		else add(others, it.totalCents);
	}
	return shares;
}
