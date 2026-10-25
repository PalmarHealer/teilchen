import { describe, expect, it } from 'vitest';
import {
	personBalances,
	planPersonSettlement,
	settlementEntries,
	type LedgerEntry
} from './ledger';
import { allocate, parseCents, splitEqually } from './money';

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
	it('verteilt Rest-Cent ohne Verlust', () => {
		expect(splitEqually(1000, 3)).toEqual([334, 333, 333]);
		expect(allocate(-1000, [1, 1, 1]).reduce((a, b) => a + b)).toBe(-1000);
		expect(allocate(199, [2, 1])).toEqual([133, 66]);
	});
	it('parst deutsche und englische Schreibweise', () => {
		expect(parseCents('12,34')).toBe(1234);
		expect(parseCents('12.3 €')).toBe(1230);
		expect(parseCents('-0,05')).toBe(-5);
		expect(parseCents('1,234')).toBeNull();
	});
});

describe('personBalances', () => {
	it('rechnet direkte Auslagen gegen Gruppenausgaben auf', () => {
		const entries = [
			// Ich lege Ben 20 € aus.
			direct('me', [['ben', 2000]]),
			// Ben zahlt in der WG 45 € für drei – mein Anteil 15 €.
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
		// Cleo hat mit mir nichts zu tun.
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

	it('ergibt eine Netto-Überweisung und Kontext-Zeilen, die jeden Saldo nullen', () => {
		const plan = planPersonSettlement('me', 'ben', entries);
		expect(plan.transfer).toEqual({ fromId: 'ben', toId: 'me', cents: 500 });
		const after = [...entries, ...settlementEntries(plan)];
		expect(personBalances('me', after).has('ben')).toBe(false);
		// Cleos Schulden bei Ben in der WG bleiben unberührt.
		expect(personBalances('cleo', after).get('ben')?.net).toBe(-1500);
	});

	it('liefert null-Transfer, wenn sich alles exakt aufhebt', () => {
		const even = [direct('me', [['ben', 1500]]), inGroup('wg', 'ben', [['me', 1500]])];
		const plan = planPersonSettlement('me', 'ben', even);
		expect(plan.transfer).toBeNull();
		expect(plan.lines).toHaveLength(2);
	});
});
