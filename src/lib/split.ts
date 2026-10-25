import { allocate, splitEqually, type Cents } from './money';

/** mine = only me ("das hab ich"); theirs = the others ("das du"); shared = everyone ("das wir"). */
export type Decision = 'mine' | 'shared' | 'theirs';

export interface SplitItem {
	totalCents: Cents;
	kind: 'product' | 'discount';
	/** False for receipt lines marked "*" (deposit etc.), which discounts don't apply to */
	discountable: boolean;
	/** Products only; discounts are never swiped */
	decision: Decision | null;
}

/**
 * Receipt items → share per person. Products follow their swipe decision; discounts and redeemed
 * coupons are spread over the people in proportion to what they got of the discountable products.
 */
export function sharesFromItems(
	me: string,
	participants: string[],
	items: SplitItem[]
): Map<string, Cents> {
	const everyone = participants.includes(me) ? participants : [me, ...participants];
	const others = everyone.filter((p) => p !== me);
	const shares = new Map<string, Cents>(everyone.map((p) => [p, 0]));
	const eligible = new Map<string, Cents>(everyone.map((p) => [p, 0]));

	const add = (people: string[], item: SplitItem) =>
		allocate(
			item.totalCents,
			people.map(() => 1)
		).forEach((c, i) => {
			const p = people[i]!;
			shares.set(p, shares.get(p)! + c);
			if (item.discountable && c > 0) eligible.set(p, eligible.get(p)! + c);
		});

	for (const it of items) {
		if (it.kind !== 'product') continue;
		if (it.decision === 'mine' || others.length === 0) add([me], it);
		else if (it.decision === 'shared') add(everyone, it);
		else add(others, it);
	}

	const discount = items.filter((i) => i.kind === 'discount').reduce((a, i) => a + i.totalCents, 0);
	if (discount !== 0) {
		// Fall back to all positive shares, then to me, if nothing discountable was bought.
		let weights = everyone.map((p) => eligible.get(p)!);
		if (weights.every((w) => w <= 0)) weights = everyone.map((p) => Math.max(0, shares.get(p)!));
		if (weights.every((w) => w <= 0)) weights = everyone.map((p) => (p === me ? 1 : 0));
		allocate(discount, weights).forEach((c, i) => {
			const p = everyone[i]!;
			shares.set(p, shares.get(p)! + c);
		});
	}
	return shares;
}

/** A product's swipe: one decision for the whole line, or one per unit when swiped piece by piece. */
export type ItemDecision = Decision | Decision[];

/** How many pieces a line can be swiped as: whole pieces (not weights), capped to stay swipeable. */
export function unitCount(quantity: string | number, unit: string | null): number {
	const q = Math.abs(Number(quantity));
	return unit !== 'kg' && Number.isInteger(q) && q > 1 && q <= 20 ? q : 1;
}

/** Turns lines swiped piece by piece into one SplitItem per unit, in equal parts of the total. */
export function expandUnits(
	items: (Omit<SplitItem, 'decision'> & { decision: ItemDecision | null })[]
): SplitItem[] {
	return items.flatMap(({ decision, ...it }): SplitItem[] =>
		Array.isArray(decision)
			? splitEqually(it.totalCents, decision.length).map((totalCents, u) => ({
					...it,
					totalCents,
					decision: decision[u]!
				}))
			: [{ ...it, decision }]
	);
}

/** The three piles of a swiped receipt, plus the discount spread over them. */
export function swipeTotals(items: SplitItem[]) {
	const sum = (pred: (i: SplitItem) => boolean) =>
		items.filter(pred).reduce((a, i) => a + i.totalCents, 0);
	return {
		mine: sum((i) => i.kind === 'product' && i.decision === 'mine'),
		theirs: sum((i) => i.kind === 'product' && i.decision === 'theirs'),
		shared: sum((i) => i.kind === 'product' && i.decision === 'shared'),
		discount: sum((i) => i.kind === 'discount')
	};
}
