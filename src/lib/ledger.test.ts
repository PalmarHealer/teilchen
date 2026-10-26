import { describe, expect, it } from 'vitest';
import {
	groupBalances,
	isSettled,
	personBalances,
	planPersonSettlement,
	partialSettlement,
	settlementEntries,
	withoutKept,
	type LedgerEntry
} from './ledger';
import { allocate, centsToInput, parseCents, splitEqually } from './money';

const direct = (payerId: string, shares: [string, number][]): LedgerEntry => ({
	contextId: null,
	payerId,
	shares: shares.map(([userId, cents]) => ({ userId, cents }))
});
const inGroup = (g: string, payerId: string, shares: [string, number][]): LedgerEntry => ({
	...direct(payerId, shares),
	contextId: g
});

describe('money', () => {
	it('distributes leftover cents without loss', () => {
		expect(splitEqually(1000, 3)).toEqual([334, 333, 333]);
		expect(allocate(-1000, [1, 1, 1]).reduce((a, b) => a + b)).toBe(-1000);
		expect(allocate(199, [2, 1])).toEqual([133, 66]);
	});
	it('parses German and English notation', () => {
		expect(parseCents('12,34')).toBe(1234);
		expect(parseCents('12.3 €')).toBe(1230);
		expect(parseCents('-0,05')).toBe(-5);
		expect(parseCents('1,234')).toBeNull();
		expect(parseCents('99999999999')).toBeNull();
		expect(parseCents('-99999999999')).toBeNull();
	});

	it('turns cents back into input text', () => {
		expect(centsToInput(1234)).toBe('12,34');
		expect(centsToInput(5, '.')).toBe('0.05');
		expect(parseCents(centsToInput(-1999))).toBe(-1999);
	});
});

describe('personBalances', () => {
	it('nets direct advances against group expenses', () => {
		const entries = [
			// I advance Ben €20.
			direct('me', [['ben', 2000]]),
			// Ben pays €45 for three in the flat – my share is €15.
			inGroup('wg', 'ben', [
				['ben', 1500],
				['me', 1500],
				['cleo', 1500]
			])
		];
		const ben = personBalances('me', entries).get('ben')!;
		expect(ben.net).toBe(500);
		expect(ben.byContext.get(null)).toBe(2000);
		expect(ben.byContext.get('wg')).toBe(-1500);
		// Cleo has nothing to do with me.
		expect(personBalances('me', entries).has('cleo')).toBe(false);
	});
});

describe('planPersonSettlement', () => {
	const entries = [
		direct('me', [['ben', 2000]]),
		inGroup('wg', 'ben', [
			['ben', 1500],
			['me', 1500],
			['cleo', 1500]
		])
	];

	it('yields one net transfer and context lines that zero every balance', () => {
		const plan = planPersonSettlement('me', 'ben', entries);
		expect(plan.transfer).toEqual({ fromId: 'ben', toId: 'me', cents: 500 });
		const after = [...entries, ...settlementEntries(plan)];
		expect(personBalances('me', after).has('ben')).toBe(false);
		// Cleo's debt to Ben in the flat stays untouched.
		expect(personBalances('cleo', after).get('ben')?.net).toBe(-1500);
	});

	it('returns a null transfer when everything cancels out exactly', () => {
		const even = [direct('me', [['ben', 1500]]), inGroup('wg', 'ben', [['me', 1500]])];
		const plan = planPersonSettlement('me', 'ben', even);
		expect(plan.transfer).toBeNull();
		expect(plan.lines).toHaveLength(2);
	});
});

describe('groupBalances', () => {
	it('sums paid minus consumed per member and detects a settled group', () => {
		const entries = [
			inGroup('wg', 'ben', [
				['ben', 1500],
				['me', 1500],
				['cleo', 1500]
			])
		];
		const open = groupBalances(['me', 'ben', 'cleo'], entries);
		expect(Object.fromEntries(open)).toEqual({ me: -1500, ben: 3000, cleo: -1500 });
		expect(isSettled(open)).toBe(false);

		const paidBack = [
			...entries,
			inGroup('wg', 'me', [['ben', 1500]]),
			inGroup('wg', 'cleo', [['ben', 1500]])
		];
		expect(isSettled(groupBalances(['me', 'ben', 'cleo'], paidBack))).toBe(true);
	});
});

describe('groups that keep their debts', () => {
	it('stay out of the per-person netting', () => {
		const entries = [
			inGroup('trip', 'me', [['ben', 3000]]),
			inGroup('flat', 'ben', [['me', 1000]]),
			direct('me', [['ben', 500]])
		];
		const plan = planPersonSettlement('me', 'ben', withoutKept(entries, new Set(['trip'])));
		expect(plan.transfer).toEqual({ fromId: 'me', toId: 'ben', cents: 500 });
		expect(plan.lines.map((l) => l.contextId).sort()).toEqual([null, 'flat'].sort());
	});
});

describe('partial settlement', () => {
	// Ben owes me 30 direct and 10 in the trip, I owe him 15 in the flat: net 25 to me.
	const entries = [
		direct('me', [['ben', 3000]]),
		inGroup('trip', 'me', [['ben', 1000]]),
		inGroup('flat', 'ben', [['me', 1500]])
	];
	const full = planPersonSettlement('me', 'ben', entries);

	it('spreads the payment over the contexts where the payer owes', () => {
		const plan = partialSettlement(full, 1000);
		expect(plan.transfer).toEqual({ fromId: 'ben', toId: 'me', cents: 1000 });
		expect(plan.lines.map((l) => [l.contextId, l.cents])).toEqual([
			[null, 750],
			['trip', 250]
		]);
		const after = personBalances('me', [...entries, ...settlementEntries(plan)]).get('ben')!;
		expect(after.net).toBe(1500);
		expect(after.byContext.get('flat')).toBe(-1500);
	});

	it('is the full settlement for the full amount or more', () => {
		expect(partialSettlement(full, 2500)).toEqual(full);
		expect(partialSettlement(full, 9999)).toEqual(full);
	});
});
