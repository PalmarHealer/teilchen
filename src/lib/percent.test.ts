import { describe, expect, it } from 'vitest';
import { centsForPercents, parsePercent, percentOf } from './percent';

describe('percent split', () => {
	it('parses German and English notation', () => {
		expect(parsePercent('33,3')).toBe(33.3);
		expect(parsePercent('12.5 %')).toBe(12.5);
		expect(parsePercent('100')).toBe(100);
		expect(parsePercent('101')).toBeNull();
		expect(parsePercent('-5')).toBeNull();
		expect(parsePercent('')).toBeNull();
	});

	it('relates a part to the total', () => {
		expect(percentOf(2500, 10000)).toBe(25);
		expect(percentOf(100, 0)).toBeNull();
	});

	it('splits exactly when the percentages make 100', () => {
		const parts = centsForPercents(1000, [33.3, 33.3, 33.4]);
		expect(parts.reduce((a, b) => a + b)).toBe(1000);
		expect(centsForPercents(1001, [50, 50])).toEqual([501, 500]);
	});

	it('rounds each share when the percentages are incomplete', () => {
		expect(centsForPercents(1000, [25])).toEqual([250]);
		expect(centsForPercents(999, [50])).toEqual([500]);
	});
});
