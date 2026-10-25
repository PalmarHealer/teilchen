import { describe, expect, it } from 'vitest';
import { looksLikeEbon } from './classify';

describe('looksLikeEbon', () => {
	it('accepts a forwarded REWE eBon', () => {
		expect(
			looksLikeEbon({
				texts: ['WG: Dein REWE eBon vom 24.10.2026', 'Von: REWE eBon <ebon@mailing.rewe.de>'],
				pdfNames: ['REWE-eBon.pdf']
			})
		).toBe(true);
	});

	it('accepts the original sender even with a neutral subject', () => {
		expect(
			looksLikeEbon({ texts: ['Fwd: Ihr Einkauf', 'ebon@mailing.rewe.de'], pdfNames: ['x.pdf'] })
		).toBe(true);
	});

	it('accepts the invoice of a REWE online order', () => {
		expect(
			looksLikeEbon({
				texts: ['Deine Rechnung zur Bestellung B-AAA-BBB', 'REWE Lieferservice <service@rewe.de>'],
				pdfNames: ['document.pdf']
			})
		).toBe(true);
	});

	it('ignores forwarded login codes and other mails', () => {
		expect(
			looksLikeEbon({ texts: ['Dein REWE Anmeldecode: 123456', 'noreply@rewe.de'], pdfNames: [] })
		).toBe(false);
		expect(
			looksLikeEbon({
				texts: ['Rechnung Oktober', 'billing@example.com'],
				pdfNames: ['invoice.pdf']
			})
		).toBe(false);
	});

	it('needs a PDF even when the mail mentions an eBon', () => {
		expect(looksLikeEbon({ texts: ['Dein eBon ist bereit'], pdfNames: [] })).toBe(false);
	});
});
