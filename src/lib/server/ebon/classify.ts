/**
 * Whether a mail in the shared inbox is meant for us (store eBon or online order invoice).
 * Forwarding rules often catch more than eBons (login codes, newsletters), so anything that
 * isn't clearly a REWE receipt is ignored silently instead of being treated as an error.
 */
export function looksLikeEbon(mail: {
	/** Subjects, senders and body texts of the mail and any forwarded mail inside it */
	texts: (string | undefined)[];
	pdfNames: (string | undefined)[];
}): boolean {
	if (mail.pdfNames.length === 0) return false;
	const haystack = [...mail.texts, ...mail.pdfNames].filter(Boolean).join('\n');
	if (/mailing\.rewe\.de/i.test(haystack) || /\be-?bon\b/i.test(haystack)) return true;
	// Online orders: the delivery service mails its invoice ("Rechnung") as a PDF.
	return /rewe/i.test(haystack) && /rechnung|bestellung|lieferservice/i.test(haystack);
}
