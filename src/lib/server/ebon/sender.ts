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
