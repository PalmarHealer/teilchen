import { describe, expect, it } from 'vitest';
import { formatAmountInput } from './amount-input';
import { parseCents } from './money';

/** Formats `typed` with the caret at "|" (or the end). */
function type(typed: string, decimal: ',' | '.' = ',', opts = {}) {
	const caret = typed.includes('|') ? typed.indexOf('|') : typed.length;
	const out = formatAmountInput(typed.replace('|', ''), caret, decimal, opts);
	return out.text.slice(0, out.caret) + '|' + out.text.slice(out.caret);
}

describe('formatAmountInput', () => {
	it('groups thousands as you type', () => {
		expect(type('1234')).toBe('1.234|');
		expect(type('1234567,8')).toBe('1.234.567,8|');
		expect(type('1234', '.')).toBe('1,234|');
		expect(type('1.2345')).toBe('12.345|');
	});

	it('keeps the caret behind the same digit', () => {
		expect(type('12|34')).toBe('1.2|34');
		expect(type('1.23|4')).toBe('1.23|4');
		expect(type('1.234|5')).toBe('12.34|5');
	});

	it('starts the decimals with a separator typed by hand, at most two digits', () => {
		expect(type('1.234.', ',', { typedAt: 5 })).toBe('1.234,|');
		expect(type(',', ',', { typedAt: 0 })).toBe('0,|');
		expect(type('12,345')).toBe('12,34|');
		expect(type('007')).toBe('7|');
	});

	it('reads a pasted decimal point in German', () => {
		expect(type('12.50', ',', { pasted: true })).toBe('12,50|');
		expect(type('1,234.5', ',', { pasted: true })).toBe('1.234,5|');
		expect(type('€ 1.000', ',', { pasted: true })).toBe('1.000|');
	});

	it('produces what the server parses', () => {
		for (const raw of ['1234567,89', '0,5', '42'])
			expect(parseCents(formatAmountInput(raw, 0, ',').text)).toBe(parseCents(raw));
	});
});
