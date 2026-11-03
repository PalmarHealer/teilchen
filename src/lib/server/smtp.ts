import { createTransport, type Transporter } from 'nodemailer';
import { env, optionalEnv } from './db/env.ts';

let transport: Transporter | undefined;

/**
 * Sends from the eBon inbox itself, over SMTP with the same login as IMAP (SMTP_HOST and
 * SMTP_PORT only if they differ from IMAP_HOST and 465).
 */
export async function sendMail(mail: { to: string; subject: string; text: string }) {
	transport ??= createTransport({
		host: optionalEnv('SMTP_HOST') ?? env('IMAP_HOST'),
		port: Number(optionalEnv('SMTP_PORT') ?? 465),
		secure: Number(optionalEnv('SMTP_PORT') ?? 465) === 465,
		auth: { user: env('IMAP_USER'), pass: env('IMAP_PASSWORD') }
	});
	await transport.sendMail({ from: `Teilchen <${env('INBOX_ADDRESS')}>`, ...mail });
}

export const canSendMail = () => !!(optionalEnv('IMAP_HOST') && optionalEnv('INBOX_ADDRESS'));
