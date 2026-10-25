import { allocate, type Cents } from './money';

export type Decision = 'mine' | 'shared' | 'theirs';

/**
 * Bon-Positionen → Anteile pro Person.
 * mine = nur ich; shared = alle Beteiligten gleich; theirs = alle außer mir gleich.
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

/** Freie Ausgabe aufteilen: gleich, oder nach festen Beträgen (Rest landet beim Zahler). */
export function sharesEqual(amount: Cents, people: string[]): Map<string, Cents> {
	return new Map(
		allocate(
			amount,
			people.map(() => 1)
		).map((c, i) => [people[i]!, c])
	);
}
