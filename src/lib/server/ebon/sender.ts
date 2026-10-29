/**
 * The From header is easy to forge, so a mail is matched to a user by its sender only if our own
 * mail server confirmed that sender with DMARC. Its verdict is the topmost Authentication-Results
 * header (servers prepend theirs); headers further down came with the mail and prove nothing.
 */
export function dmarcVerifiedDomain(
	headerLines: readonly { key: string; line: string }[],
	authservId: string
): string | null {
	const top = headerLines.find((h) => h.key.toLowerCase() === 'authentication-results');
	if (!top) return null;
	const value = top.line
		.replace(/\r?\n[ \t]+/g, ' ')
		.slice(top.line.indexOf(':') + 1)
		.replace(/\([^)]*\)/g, '');
	const [server, ...results] = value.split(';').map((p) => p.trim());
	if (server?.split(/\s+/)[0]?.toLowerCase() !== authservId.toLowerCase()) return null;
	for (const r of results) {
		const m = r.match(/^dmarc=pass\b.*\bheader\.from=([^\s;]+)/i);
		if (m) return m[1]!.toLowerCase();
	}
	return null;
}

/** Headers that name who a mail was delivered to, also when it was redirected on the way. */
const ENVELOPE_HEADERS = ['delivered-to', 'x-original-to', 'envelope-to', 'x-forwarded-to'];

/**
 * Recipient addresses from the delivery headers, not the visible To: a redirected mail keeps the
 * original To (e.g. the user's own address) and only these name our teilchen+<token> address.
 * Received headers count for their "for <address>" clause.
 */
export function envelopeAddresses(headerLines: readonly { key: string; line: string }[]): string[] {
	const found: string[] = [];
	for (const h of headerLines) {
		const key = h.key.toLowerCase();
		const value = h.line.replace(/\r?\n[ \t]+/g, ' ').slice(h.line.indexOf(':') + 1);
		const text = ENVELOPE_HEADERS.includes(key)
			? value
			: key === 'received'
				? (value.match(/\bfor\s+<?[^\s<>;]+@[^\s<>;]+>?/gi) ?? []).join(' ')
				: '';
		for (const m of text.matchAll(/[^\s<>"',;:]+@[^\s<>"',;]+\.[a-z]{2,}/gi))
			found.push(m[0].toLowerCase());
	}
	return found;
}
