import { describe, expect, it } from 'vitest';
import { canManageExpense } from './permissions';

describe('canManageExpense', () => {
	const mine = { createdBy: 'me', kind: 'expense' as const };
	const bens = { createdBy: 'ben', kind: 'expense' as const };

	it('lets whoever added an expense manage it', () => {
		expect(canManageExpense('me', mine, null)).toBe(true);
		expect(canManageExpense('me', bens, null)).toBe(false);
	});

	it('lets the group creator manage any expense of the group', () => {
		expect(canManageExpense('me', bens, 'me')).toBe(true);
		expect(canManageExpense('me', bens, 'cleo')).toBe(false);
	});

	it('keeps settlements with whoever recorded them', () => {
		expect(canManageExpense('me', { createdBy: 'ben', kind: 'settlement' }, 'me')).toBe(false);
		expect(canManageExpense('ben', { createdBy: 'ben', kind: 'settlement' }, 'me')).toBe(true);
	});
});
