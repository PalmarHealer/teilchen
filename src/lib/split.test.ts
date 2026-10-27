import { describe, expect, it } from 'vitest';
import {
	expandUnits,
	resolveReceipt,
	resolveSwipes,
	sharesFromItems,
	swipeTotals,
	unitCount,
	type Decision,
	type SplitItem
} from './split';

const product = (
	totalCents: number,
	decision: SplitItem['decision'],
	discountable = true
): SplitItem => ({
	totalCents,
	decision,
	kind: 'product',
	discountable
});
const discount = (totalCents: number): SplitItem => ({
	totalCents,
	decision: null,
	kind: 'discount',
	discountable: false
});

describe('sharesFromItems', () => {
	it('splits according to the swipe decision', () => {
		const s = sharesFromItems(
			'me',
			['me', 'ben', 'cleo'],
			[product(300, 'shared'), product(199, 'mine'), product(401, 'theirs')]
		);
		expect(Object.fromEntries(s)).toEqual({ me: 299, ben: 301, cleo: 300 });
		expect([...s.values()].reduce((a, b) => a + b)).toBe(900);
	});

	it('passes negative products (bottle returns) on like any other item', () => {
		const s = sharesFromItems('me', ['ben'], [product(-30, 'shared')]);
		expect(Object.fromEntries(s)).toEqual({ me: -15, ben: -15 });
	});

	it('spreads a coupon in proportion to what everyone got', () => {
		// I keep 30 €, Ben gets 10 €, so the 4 € coupon goes 3:1.
		const s = sharesFromItems(
			'me',
			['me', 'ben'],
			[product(3000, 'mine'), product(1000, 'theirs'), discount(-400)]
		);
		expect(Object.fromEntries(s)).toEqual({ me: 2700, ben: 900 });
	});

	it('leaves items marked "*" (deposit) out of the coupon split', () => {
		const s = sharesFromItems(
			'me',
			['me', 'ben'],
			[
				product(1000, 'mine'),
				product(1000, 'theirs', false), // deposit Ben pays, no discount on it
				discount(-100)
			]
		);
		expect(Object.fromEntries(s)).toEqual({ me: 900, ben: 1000 });
	});

	it('still adds up when only non-discountable things were bought', () => {
		const s = sharesFromItems('me', ['me', 'ben'], [product(500, 'shared', false), discount(-100)]);
		expect([...s.values()].reduce((a, b) => a + b)).toBe(400);
	});
});

describe('swipeTotals', () => {
	it('sums the three piles and the discount', () => {
		expect(
			swipeTotals([
				product(300, 'shared'),
				product(199, 'mine'),
				product(401, 'theirs'),
				discount(-50)
			])
		).toEqual({ mine: 199, theirs: 401, shared: 300, discount: -50 });
	});
});

describe('swiping piece by piece', () => {
	it('only offers whole pieces, not weights or single items', () => {
		expect(unitCount('2', null)).toBe(2);
		expect(unitCount('1', null)).toBe(1);
		expect(unitCount('1.05', 'kg')).toBe(1);
		expect(unitCount('3', 'kg')).toBe(1);
		expect(unitCount('2.5', null)).toBe(1);
	});

	it('splits a line into equal units with their own decision', () => {
		// Two rolls for 99 cents: I keep one, the other is shared with Ben.
		const items = expandUnits([
			{ totalCents: 99, kind: 'product', discountable: true, decision: ['mine', 'shared'] },
			{ totalCents: 100, kind: 'product', discountable: true, decision: 'theirs' }
		]);
		expect(items.map((i) => [i.totalCents, i.decision])).toEqual([
			[50, 'mine'],
			[49, 'shared'],
			[100, 'theirs']
		]);
		const s = sharesFromItems('me', ['me', 'ben'], items);
		expect(Object.fromEntries(s)).toEqual({ me: 75, ben: 124 });
	});
});

describe('resolveSwipes', () => {
	const two = ['me', 'ben'];
	const group = ['me', 'ben', 'cleo'];
	const votes = (v: Record<string, Decision>) => new Map(Object.entries(v));

	it('agrees when both see it the same way', () => {
		expect(resolveSwipes('me', two, votes({ me: 'theirs', ben: 'mine' }))).toEqual({
			owners: ['ben'],
			conflict: false
		});
		expect(resolveSwipes('me', two, votes({ me: 'shared', ben: 'shared' }))).toEqual({
			owners: two,
			conflict: false
		});
	});

	it('finds the owner in a group from everyone\'s "not mine"', () => {
		// I say "yours", Ben says "yours" (so not his), Cleo hasn't swiped: it's Cleo's.
		expect(resolveSwipes('me', group, votes({ me: 'theirs', ben: 'theirs' }))).toEqual({
			owners: ['cleo'],
			conflict: false
		});
		expect(resolveSwipes('me', group, votes({ me: 'theirs', cleo: 'mine' }))).toEqual({
			owners: ['cleo'],
			conflict: false
		});
	});

	it("is a conflict when claims don't fit, and then the payer's swipe counts", () => {
		expect(resolveSwipes('me', two, votes({ me: 'shared', ben: 'theirs' }))).toEqual({
			owners: two,
			conflict: true
		});
		expect(resolveSwipes('me', group, votes({ me: 'theirs', ben: 'mine', cleo: 'mine' }))).toEqual({
			owners: ['ben', 'cleo'],
			conflict: true
		});
		expect(resolveSwipes('me', two, votes({ me: 'shared', ben: 'mine' })).conflict).toBe(true);
	});
});

describe('resolveReceipt', () => {
	const line = (id: string, totalCents: number, quantity = 1) => ({
		id,
		totalCents,
		kind: 'product' as const,
		discountable: true,
		quantity,
		unit: null,
		owners: null
	});

	it('combines swipes into shares and counts conflicts', () => {
		const r = resolveReceipt(
			'me',
			['me', 'ben'],
			[line('a', 300), line('b', 200)],
			new Map([
				['me', { a: 'shared', b: 'theirs' }],
				['ben', { a: 'mine', b: 'mine' }]
			])
		);
		expect(r.conflicts).toBe(1);
		expect(Object.fromEntries(r.shares)).toEqual({ me: 150, ben: 350 });
	});

	it('resolves piece by piece when one person split the line', () => {
		const r = resolveReceipt(
			'me',
			['me', 'ben'],
			[line('a', 300, 3)],
			new Map([
				['me', { a: 'shared' }],
				['ben', { a: ['shared', 'mine', 'shared'] }]
			])
		);
		expect(r.lines[0]!.pieces.map((p) => p.conflict)).toEqual([false, true, false]);
	});

	it('uses owners set by hand over all swipes', () => {
		const r = resolveReceipt(
			'me',
			['me', 'ben'],
			[{ ...line('a', 300), owners: ['ben'] }],
			new Map([['me', { a: 'mine' }]])
		);
		expect(r.conflicts).toBe(0);
		expect(Object.fromEntries(r.shares)).toEqual({ me: 0, ben: 300 });
	});
});
