import { describe, expect, it } from 'vitest';
import { sharesFromItems } from './split';

describe('sharesFromItems', () => {
	it('teilt nach Swipe-Entscheidung', () => {
		const s = sharesFromItems(
			'me',
			['me', 'ben', 'cleo'],
			[
				{ totalCents: 300, decision: 'shared' },
				{ totalCents: 199, decision: 'mine' },
				{ totalCents: 401, decision: 'theirs' }
			]
		);
		expect(Object.fromEntries(s)).toEqual({ me: 299, ben: 301, cleo: 300 });
		expect([...s.values()].reduce((a, b) => a + b)).toBe(900);
	});

	it('gibt negative Posten (Leergut, Rabatt) ebenfalls anteilig weiter', () => {
		const s = sharesFromItems('me', ['ben'], [{ totalCents: -30, decision: 'shared' }]);
		expect(Object.fromEntries(s)).toEqual({ me: -15, ben: -15 });
	});
});
