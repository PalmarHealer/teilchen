/**
 * Whether a mail in the shared inbox is meant for us. Forwarding rules often catch more than
 * eBons (login codes, newsletters), so anything that isn't clearly a REWE eBon is ignored
 * silently instead of being treated as an error.
 */
export function looksLikeEbon(mail: {
	/** Subjects, senders and body texts of the mail and any forwarded mail inside it */
	texts: (string | undefined)[];
	pdfNames: (string | undefined)[];
}): boolean {
	if (mail.pdfNames.length === 0) return false;
	const haystack = [...mail.texts, ...mail.pdfNames].filter(Boolean).join('\n');
	return /mailing\.rewe\.de/i.test(haystack) || /\bebon\b/i.test(haystack);
}
