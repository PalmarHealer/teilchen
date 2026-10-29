import { describe, expect, it } from 'vitest';
import { dmarcVerifiedDomain, envelopeAddresses } from './sender';

const ar = (line: string) => ({ key: 'authentication-results', line });
const OURS = `Authentication-Results: mail.nauren.de;
\tdkim=pass header.d=gmail.com header.s=20230601 header.b=abc;
\tspf=pass (mail.nauren.de: domain of someone@gmail.com designates 1.2.3.4 as permitted sender) smtp.mailfrom=someone@gmail.com;
\tdmarc=pass header.from=gmail.com policy.dmarc=none`;

describe('dmarcVerifiedDomain', () => {
	it("reads our server's DMARC verdict", () => {
		expect(dmarcVerifiedDomain([ar(OURS)], 'mail.nauren.de')).toBe('gmail.com');
	});

	it('ignores a failed check', () => {
		const failed = OURS.replace('dmarc=pass', 'dmarc=fail');
		expect(dmarcVerifiedDomain([ar(failed)], 'mail.nauren.de')).toBeNull();
	});

	it('ignores headers of other servers, also when forged into the mail', () => {
		const forged = OURS.replace('mail.nauren.de;', 'evil.example;');
		expect(dmarcVerifiedDomain([ar(forged)], 'mail.nauren.de')).toBeNull();
		// Only the topmost header counts: one further down came with the mail.
		const failed = OURS.replace('dmarc=pass', 'dmarc=fail');
		expect(dmarcVerifiedDomain([ar(failed), ar(OURS)], 'mail.nauren.de')).toBeNull();
	});

	it('ignores dmarc=pass inside a comment', () => {
		const sneaky = `Authentication-Results: mail.nauren.de; spf=none (dmarc=pass header.from=x.de)`;
		expect(dmarcVerifiedDomain([ar(sneaky)], 'mail.nauren.de')).toBeNull();
	});

	it('is null without the header', () => {
		expect(
			dmarcVerifiedDomain([{ key: 'from', line: 'From: a@b.de' }], 'mail.nauren.de')
		).toBeNull();
	});
});

describe('envelopeAddresses', () => {
	const line = (key: string, value: string) => ({ key, line: `${key}: ${value}` });

	it('finds our address in a redirected mail whose To is the user address', () => {
		const headers = [
			line('Delivered-To', 'teilchen+abc123@nauren.de'),
			line(
				'Received',
				'from mx.example.de by mail.nauren.de with ESMTPS id X\r\n\tfor <teilchen+abc123@nauren.de>; Wed, 29 Oct 2026 19:54:00 +0000'
			),
			line('Delivered-To', 'laurenz@example.de'),
			line('To', 'laurenz@example.de')
		];
		expect(envelopeAddresses(headers)).toEqual([
			'teilchen+abc123@nauren.de',
			'teilchen+abc123@nauren.de',
			'laurenz@example.de'
		]);
	});

	it('reads only the "for" clause of Received headers', () => {
		const headers = [line('Received', 'from a.example (helo=x@b.example) by mail.nauren.de; Wed')];
		expect(envelopeAddresses(headers)).toEqual([]);
	});
});
