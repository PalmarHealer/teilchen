import { pollMailbox } from './mail';

const MAIL_EVERY = 2 * 60_000;

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
console.log('Teilchen worker running');
