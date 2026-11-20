import { allocate, splitEqually, type Cents } from './money';

/** mine = only me ("das hab ich"); theirs = the others ("das du"); shared = everyone ("das wir"). */
export type Decision = 'mine' | 'shared' | 'theirs';

/**
 * How a receipt's deposit (Pfand) is split, chosen once per receipt: with the product it was paid
 * for ('item'), or equally between everyone ('even') – then bottle returns are split equally too,
 * and nobody has to work out whose bottle it was.
 */
export type DepositSplit = 'item' | 'even';

type Line = { totalCents: Cents; depositCents?: Cents; kind: 'product' | 'discount' };

/**
 * The part of a line that is swiped, and the deposit in it that is split equally instead.
 * `depositCents` is the deposit contained in the line's total (all of it for a pure deposit line).
 */
export function depositParts(line: Line, mode: DepositSplit): { swiped: Cents; even: Cents } {
	const deposit = line.depositCents ?? 0;
	if (mode !== 'even' || line.kind !== 'product' || !deposit)
		return { swiped: line.totalCents, even: 0 };
	return { swiped: line.totalCents - deposit, even: deposit };
}

/** Whether a line is swiped at all: products, except pure deposit lines that are split equally. */
export const isSwiped = (line: Line, mode: DepositSplit) =>
	line.kind === 'product' && depositParts(line, mode).swiped !== 0;

export interface SplitItem {
	totalCents: Cents;
	kind: 'product' | 'discount';
	/** False for receipt lines marked "*" (deposit etc.), which discounts don't apply to */
	discountable: boolean;
	/** Products only; discounts are never swiped */
	decision: Decision | null;
	/** Discounts only: who it is credited to (e.g. the payer's own REWE credit); none = everyone */
	owners?: string[];
	/** A deposit split equally between everyone (see DepositSplit) */
	deposit?: boolean;
}

/** Who gets a product under `voter`'s decision. Without anyone else, "theirs" stays with `voter`. */
export function ownersOf(voter: string, d: Decision, everyone: string[]): string[] {
	if (d === 'mine') return [voter];
	if (d === 'shared') return everyone;
	const others = everyone.filter((p) => p !== voter);
	return others.length ? others : [voter];
}

/** A product (or discount) with the people who split it equally. Discounts have no owners. */
export interface OwnedItem {
	totalCents: Cents;
	kind: 'product' | 'discount';
	discountable: boolean;
	owners: string[];
}

/**
 * Owned items → share per person. Products are split equally between their owners (or go to
 * `fallback` without any). Discounts with owners (someone's own credit) go to them alone, so their
 * share can turn negative; the other discounts and redeemed coupons are spread over the people in
 * proportion to what they got of the discountable products.
 */
export function sharesFromOwners(
	everyone: string[],
	fallback: string,
	items: OwnedItem[]
): Map<string, Cents> {
	const people = everyone.includes(fallback) ? everyone : [fallback, ...everyone];
	const shares = new Map<string, Cents>(people.map((p) => [p, 0]));
	const eligible = new Map<string, Cents>(people.map((p) => [p, 0]));

	for (const it of items) {
		if (it.kind !== 'product') continue;
		const owners = it.owners.length ? it.owners : [fallback];
		allocate(
			it.totalCents,
			owners.map(() => 1)
		).forEach((c, i) => {
			const p = owners[i]!;
			shares.set(p, (shares.get(p) ?? 0) + c);
			if (it.discountable && c > 0) eligible.set(p, (eligible.get(p) ?? 0) + c);
		});
	}

	for (const it of items) {
		if (it.kind !== 'discount' || !it.owners.length) continue;
		allocate(
			it.totalCents,
			it.owners.map(() => 1)
		).forEach((c, i) => {
			const p = it.owners[i]!;
			shares.set(p, (shares.get(p) ?? 0) + c);
		});
	}

	const discount = items
		.filter((i) => i.kind === 'discount' && !i.owners.length)
		.reduce((a, i) => a + i.totalCents, 0);
	if (discount !== 0) {
		const all = [...shares.keys()];
		// Fall back to all positive shares, then to `fallback`, if nothing discountable was bought.
		let weights = all.map((p) => eligible.get(p) ?? 0);
		if (weights.every((w) => w <= 0)) weights = all.map((p) => Math.max(0, shares.get(p)!));
		if (weights.every((w) => w <= 0)) weights = all.map((p) => (p === fallback ? 1 : 0));
		allocate(discount, weights).forEach((c, i) => {
			const p = all[i]!;
			shares.set(p, shares.get(p)! + c);
		});
	}
	return shares;
}

/** Receipt items swiped by `me` → share per person. */
export function sharesFromItems(
	me: string,
	participants: string[],
	items: SplitItem[]
): Map<string, Cents> {
	const everyone = participants.includes(me) ? participants : [me, ...participants];
	return sharesFromOwners(
		everyone,
		me,
		items.map((it) => ({
			...it,
			owners:
				it.kind === 'product'
					? ownersOf(me, it.decision ?? 'theirs', everyone)
					: (it.owners ?? []).filter((p) => everyone.includes(p))
		}))
	);
}

/**
 * Combines everyone's swipe of one product (or piece). In a group, "theirs" only says "not mine",
 * so the owners are whoever all swipes allow together; "mine" and "shared" are exact claims.
 * Swipes that can't all hold are a conflict: then the payer's swipe counts.
 */
export function resolveSwipes(
	payer: string,
	everyone: string[],
	votes: Map<string, Decision>
): { owners: string[]; conflict: boolean } {
	if (!votes.size) return { owners: [payer], conflict: false };
	const claims = [...votes].map(([voter, d]) => ({ d, owners: ownersOf(voter, d, everyone) }));
	const owners = everyone.filter((p) => claims.every((c) => c.owners.includes(p)));
	const exact = (c: (typeof claims)[number]) =>
		c.d === 'theirs' || c.owners.length === owners.length;
	if (owners.length && claims.every(exact)) return { owners, conflict: false };
	const mine = votes.get(payer);
	return { owners: mine ? ownersOf(payer, mine, everyone) : [payer], conflict: true };
}

/**
 * The pieces of a line are alike, so it only matters how many of them each person claims, not
 * in which order they swiped them ("1st mine, 2nd not" fits "1st not, 2nd mine"). Pairs up
 * everyone's swipes into pieces that agree, as many as possible; the rest are conflicts.
 * `perVoter` holds each voter's decisions, one per piece.
 */
function matchPieces(
	payer: string,
	everyone: string[],
	n: number,
	perVoter: Map<string, Decision[]>
): Map<string, Decision>[] {
	const voters = [...perVoter.keys()];
	// Positional for more people than combinations we want to try per piece
	if (voters.length < 2 || voters.length > 6)
		return Array.from(
			{ length: n },
			(_, u) => new Map(voters.map((v) => [v, perVoter.get(v)![u]!]))
		);

	const left = new Map(voters.map((v) => [v, [...perVoter.get(v)!]]));
	const options: Decision[] = ['mine', 'shared', 'theirs'];
	const combos = voters.reduce<Decision[][]>(
		(acc) => acc.flatMap((c) => options.map((o) => [...c, o])),
		[[]]
	);
	const take = (combo: Decision[]) => {
		const votes = new Map(voters.map((v, k) => [v, combo[k]!]));
		voters.forEach((v, k) => {
			const pile = left.get(v)!;
			pile.splice(pile.indexOf(combo[k]!), 1);
		});
		return votes;
	};
	const pieces: Map<string, Decision>[] = [];
	// Exact claims ("mine", "shared") first: "not mine" fits more combinations
	const exactness = (c: Decision[]) => c.filter((d) => d === 'theirs').length;
	const fitting = combos
		.filter(
			(c) => !resolveSwipes(payer, everyone, new Map(voters.map((v, k) => [v, c[k]!]))).conflict
		)
		.sort((a, b) => exactness(a) - exactness(b));
	for (const combo of fitting)
		while (voters.every((v, k) => left.get(v)!.includes(combo[k]!))) pieces.push(take(combo));
	while (pieces.length < n) pieces.push(take(voters.map((v) => left.get(v)![0]!)));
	return pieces;
}

export interface ReceiptLine {
	id: string;
	totalCents: Cents;
	kind: 'product' | 'discount';
	discountable: boolean;
	quantity: string | number;
	unit: string | null;
	/** Deposit contained in totalCents */
	depositCents?: Cents;
	/** Products: set by hand after swiping, overrides all swipes. Discounts: who it's credited to. */
	owners: string[] | null;
}

/**
 * A receipt swiped by several people: per line its pieces with owners and conflicts, and the
 * resulting shares. `swipes` holds each person's decisions by line id. A line one person swiped
 * piece by piece is resolved piece by piece for everyone. With the deposit split equally, a line's
 * `evenCents` goes to everyone in equal parts, next to its pieces.
 */
export function resolveReceipt<L extends ReceiptLine>(
	payer: string,
	everyone: string[],
	lines: L[],
	swipes: Map<string, Record<string, ItemDecision>>,
	depositSplit: DepositSplit = 'item'
) {
	const resolved = lines.map((line) => {
		const manual = line.owners?.filter((p) => everyone.includes(p));
		if (line.kind !== 'product')
			return {
				...line,
				evenCents: 0,
				pieces: [{ cents: line.totalCents, owners: manual ?? [], conflict: false }]
			};
		// A pure deposit line (or a bottle return) isn't swiped: everyone gets an equal part.
		if (!isSwiped(line, depositSplit))
			return {
				...line,
				evenCents: 0,
				pieces: [
					{ cents: line.totalCents, owners: manual?.length ? manual : everyone, conflict: false }
				]
			};
		const { swiped, even } = depositParts(line, depositSplit);
		const own = [...swipes].filter(([, d]) => d[line.id]);
		const n = unitCount(line.quantity, line.unit);
		const split = own.some(([, d]) => Array.isArray(d[line.id]) && d[line.id]!.length === n);
		const cents = split ? splitEqually(swiped, n) : [swiped];
		if (manual?.length)
			return {
				...line,
				evenCents: even,
				pieces: cents.map((c) => ({ cents: c, owners: manual, conflict: false }))
			};
		const perVoter = new Map(
			own.map(([voter, d]) => {
				const x = d[line.id]!;
				return [voter, cents.map((_, u) => (Array.isArray(x) ? (x[u] ?? x[0]!) : x))] as const;
			})
		);
		const votes = matchPieces(payer, everyone, cents.length, perVoter);
		return {
			...line,
			evenCents: even,
			pieces: cents.map((c, u) => ({ cents: c, ...resolveSwipes(payer, everyone, votes[u]!) }))
		};
	});
	const shares = sharesFromOwners(
		everyone,
		payer,
		resolved.flatMap((l) => [
			...l.pieces.map((p) => ({
				totalCents: p.cents,
				kind: l.kind,
				discountable: l.discountable,
				owners: p.owners
			})),
			// No discount applies to a deposit
			...(l.evenCents
				? [
						{
							totalCents: l.evenCents,
							kind: 'product' as const,
							discountable: false,
							owners: everyone
						}
					]
				: [])
		])
	);
	return {
		lines: resolved,
		shares,
		conflicts: resolved.filter((l) => l.pieces.some((p) => p.conflict)).length
	};
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

/**
 * The three piles of a swiped receipt, the deposit split equally, the discount spread over the
 * piles and the credit that goes to someone alone.
 */
export function swipeTotals(items: SplitItem[]) {
	const sum = (pred: (i: SplitItem) => boolean) =>
		items.filter(pred).reduce((a, i) => a + i.totalCents, 0);
	const pile = (d: Decision) => (i: SplitItem) =>
		i.kind === 'product' && !i.deposit && i.decision === d;
	return {
		mine: sum(pile('mine')),
		theirs: sum(pile('theirs')),
		shared: sum(pile('shared')),
		deposit: sum((i) => i.kind === 'product' && !!i.deposit),
		discount: sum((i) => i.kind === 'discount' && !i.owners?.length),
		credit: sum((i) => i.kind === 'discount' && !!i.owners?.length)
	};
}

/**
 * A receipt's lines with one person's swipe → SplitItems: lines swiped piece by piece become one
 * item per piece, and a deposit split equally becomes an item of its own that everyone shares.
 */
export function swipedItems(
	lines: (Line & {
		id: string;
		discountable: boolean;
		/** Discounts only: who it is credited to */
		owners?: string[] | null;
	})[],
	decisions: Record<string, ItemDecision | null>,
	depositSplit: DepositSplit
): SplitItem[] {
	return lines.flatMap((l): SplitItem[] => {
		if (l.kind === 'discount')
			return [
				{
					totalCents: l.totalCents,
					kind: 'discount',
					discountable: l.discountable,
					decision: null,
					owners: l.owners ?? []
				}
			];
		const deposit = (totalCents: Cents): SplitItem => ({
			totalCents,
			kind: 'product',
			discountable: false,
			decision: 'shared',
			deposit: true
		});
		if (!isSwiped(l, depositSplit)) return [deposit(l.totalCents)];
		const { swiped, even } = depositParts(l, depositSplit);
		return [
			...expandUnits([
				{
					totalCents: swiped,
					kind: 'product',
					discountable: l.discountable,
					decision: decisions[l.id] ?? null
				}
			]),
			...(even ? [deposit(even)] : [])
		];
	});
}
