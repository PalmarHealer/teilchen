import { describe, expect, it } from 'vitest';
import { parseEbonText } from './parse';

// Layout follows anonymised real eBons (e-kotov/rewe-ebon-parser)
const SAMPLE = `REWE Markt GmbH
Musterstr. 1
12345 Musterstadt
UID Nr.: DE812706034
EUR
BIO HACK SW RD 12,38 B
2 Stk x 6,19
BANANE CHIQUITA 2,61 B
1,050 kg x 2,49 EUR/kg
MINERALWASSER 0,59 A
PFAND 0,25 EURO 0,25 A *
LEERG. MW E. ST -0,30 B *
2 Stk x 0,15
--------------------------------------
SUMME EUR 15,53
======================================
Geg. EC-Cash EUR 15,53
11.07.2026 14:00 Bon-Nr.:1544
Markt:4711 Kasse:2 Bed.:123456`;

describe('parseEbonText', () => {
	const bon = parseEbonText(SAMPLE)!;

	it('reads items, quantities and total', () => {
		expect(bon.totalCents).toBe(1553);
		expect(bon.items.map((i) => [i.name, i.totalCents])).toEqual([
			['BIO HACK SW RD', 1238],
			['BANANE CHIQUITA', 261],
			['MINERALWASSER (inkl. Pfand)', 84],
			['LEERG. MW E. ST', -30]
		]);
		expect(bon.items[0]).toMatchObject({ quantity: 2, unit: 'Stk' });
		expect(bon.items[1]).toMatchObject({ quantity: 1.05, unit: 'kg' });
		expect(bon.mismatch).toBe(false);
	});

	it('reads the date in Berlin time and the receipt number', () => {
		expect(bon.purchasedAt.toISOString()).toBe('2026-07-11T12:00:00.000Z');
		expect(bon.bonNr).toBe('1544');
		expect(bon.market).toBe('REWE Markt GmbH, Musterstr. 1, 12345 Musterstadt');
	});

	it('flags missing items as mismatch', () => {
		expect(parseEbonText(SAMPLE.replace('BANANE CHIQUITA 2,61 B\n', ''))!.mismatch).toBe(true);
	});

	it('returns null for non-eBons', () => {
		expect(parseEbonText('Hallo Welt')).toBeNull();
	});
});
