import { describe, expect, it } from 'vitest';
import { dmarcVerifiedDomain } from './sender';

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
