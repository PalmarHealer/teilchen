import { describe, expect, it } from 'vitest';
import { pastedRedirectProblem } from './client';

describe('pastedRedirectProblem', () => {
	it('accepts the app redirect with a code', () => {
		expect(pastedRedirectProblem('de.rewe.app://redirect?state=x&code=abc.def')).toBeNull();
	});

	it('recognises the login page URL that stays in the address bar', () => {
		const loginPage =
			'https://account.rewe.de/realms/sso/login-actions/authenticate?session_code=x&execution=y&client_id=reweios';
		expect(pastedRedirectProblem(loginPage)).toBe('wrongUrl');
	});

	it('reports text without any code', () => {
		expect(pastedRedirectProblem('hello')).toBe('noCode');
	});
});
