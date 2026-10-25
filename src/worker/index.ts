import { pollMailbox } from './mail';
import { syncReweAccounts } from './rewe';

const MAIL_EVERY = 2 * 60_000;
const REWE_EVERY = 3 * 60 * 60_000;

function every(ms: number, name: string, job: () => Promise<void>) {
	const run = async () => {
		try {
			await job();
		} catch (e) {
			console.error(`[${name}]`, e);
		}
		setTimeout(run, ms);
	};
	void run();
}

every(MAIL_EVERY, 'mail', pollMailbox);
every(REWE_EVERY, 'rewe', syncReweAccounts);
console.log('Teilchen-Worker läuft');
