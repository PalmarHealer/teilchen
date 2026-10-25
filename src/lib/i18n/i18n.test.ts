import { describe, expect, it } from 'vitest';
import { formatMoney, negotiate, translate } from './index.ts';

describe('i18n', () => {
	it('negotiates the browser language with English as fallback', () => {
		expect(negotiate('de-DE,de;q=0.9,en;q=0.8')).toBe('de');
		expect(negotiate('fr-FR,en;q=0.5,de;q=0.7')).toBe('de');
		expect(negotiate('fr-FR')).toBe('en');
		expect(negotiate(null)).toBe('en');
	});

	it('interpolates variables and plurals', () => {
		expect(translate('en', 'person.owesYou', { name: 'Ben' })).toBe('Ben owes you');
		expect(translate('de', 'swipe.items', { n: 1 })).toBe('1 Position');
		expect(translate('en', 'swipe.items', { n: 7 })).toBe('7 items');
	});

	it('formats money per locale', () => {
		expect(formatMoney('en', 1216)).toBe('€12.16');
		expect(formatMoney('de', 1216)).toBe('12,16 €');
	});
});
