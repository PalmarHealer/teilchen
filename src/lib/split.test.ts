import { describe, expect, it } from 'vitest';
import { sharesFromItems, swipeTotals, type SplitItem } from './split';

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
