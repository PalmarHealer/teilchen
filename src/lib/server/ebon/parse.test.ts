import { describe, expect, it } from 'vitest';
import { parseEbonText, parseReceiptText } from './parse';

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
		expect(bon.number).toBe('1544');
		expect(bon.market).toBe('REWE Markt GmbH, Musterstr. 1, 12345 Musterstadt');
	});

	it('flags missing items as mismatch', () => {
		expect(parseEbonText(SAMPLE.replace('BANANE CHIQUITA 2,61 B\n', ''))!.mismatch).toBe(true);
	});

	it('returns null for non-eBons', () => {
		expect(parseEbonText('Hallo Welt')).toBeNull();
	});
});

// Layout of a REWE delivery-service invoice (anonymised, as pdfToText returns it)
const INVOICE = `Rechnung
REWE Markt GmbH, Domstr. 20, 50668 Köln
Max Muster Belegnummer PN00000000000000
Musterweg 1
Bestellnummer B-AAA-BBB-CCC
Bestelldatum 13.10.2026
Liefertermin 14.10.2026
Rechnungsdatum 14.10.2026
Menge MwSt. Einzelpreis Gesamt
Produkt
REWE Bio Mango Lassi 250g 3 B 0,99 € 2,97 €
Gustavo Gusto Pizza Margherita 410g 2 B 4,99 € 9,98 €
natürlich ECO Recycling Küchentücher 3x160 Blatt 1 A 2,99 € 2,99 €
Bio Banane ca. 200g 680g B 1,99 €/kg 1,35 €
Seite 1 von 2 www.rewe.de
Rechnung
Menge MwSt. Einzelpreis Gesamt
Produkt
Valensina Milder Multivitamin 1l 2 A 2,49 € 4,98 €
PFAND 0,25* 2 A 0,25 € 0,50 €
Pfandtasche* 6 A 0,50 € 3,00 €
Pfandtasche* -6 A 0,50 € -3,00 €
Liefergebühr 1 A/B 0,00 € 0,00 €
Summe Rabatt Gesamtpositionen** 1 A/B -5,00 € -5,00 €
Gesamtsumme 17,77 €
A = 19 % 9,13 € 1,73 € 10,86 €
Gezahlter Betrag 17,77 €`;

describe('parseReceiptText – online invoice', () => {
	const bill = parseReceiptText(INVOICE)!;

	it('reads the product table across pages', () => {
		expect(bill.items.map((i) => [i.name, i.totalCents, i.kind])).toEqual([
			['REWE Bio Mango Lassi 250g', 297, 'product'],
			['Gustavo Gusto Pizza Margherita 410g', 998, 'product'],
			['natürlich ECO Recycling Küchentücher 3x160 Blatt', 299, 'product'],
			['Bio Banane ca. 200g', 135, 'product'],
			['Valensina Milder Multivitamin 1l', 498, 'product'],
			['PFAND 0,25', 50, 'product'],
			['Summe Rabatt Gesamtpositionen', -500, 'discount']
		]);
		expect(bill.totalCents).toBe(1777);
		expect(bill.mismatch).toBe(false);
	});

	it('keeps quantities, weights and the "*" marker', () => {
		expect(bill.items[0]).toMatchObject({ quantity: 3, unit: 'Stk', discountable: true });
		expect(bill.items[3]).toMatchObject({ quantity: 0.68, unit: 'kg' });
		expect(bill.items[5]).toMatchObject({ discountable: false });
	});

	it('reads order number and date, and drops lines that cancel out', () => {
		expect(bill.number).toBe('B-AAA-BBB-CCC');
		expect(bill.purchasedAt.toISOString()).toBe('2026-10-14T10:00:00.000Z');
		expect(bill.items.some((i) => i.name.startsWith('Pfandtasche'))).toBe(false);
	});
});

describe('parseEbonText – discounts', () => {
	it('turns negative coupon lines into discounts and keeps bottle returns swipeable', () => {
		const bon = parseEbonText(
			SAMPLE.replace(
				'--------------------------------------\nSUMME EUR 15,53',
				'Mitarbeiterrabatt5% -0,50 A\n--------------------------------------\nSUMME EUR 15,03'
			)
		)!;
		expect(bon.items.at(-1)).toMatchObject({ name: 'Mitarbeiterrabatt5%', kind: 'discount' });
		expect(bon.items.find((i) => i.name.startsWith('LEERG'))).toMatchObject({ kind: 'product' });
		expect(bon.mismatch).toBe(false);
	});
});
