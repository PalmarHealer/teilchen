import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{ ignores: ['build/', '.svelte-kit/', 'drizzle/'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		rules: {
			'no-undef': 'off',
			// Kein base-path im Einsatz; resolve() für jeden Link wäre nur Rauschen.
			'svelte/no-navigation-without-resolve': 'off',
			// Geld nur als Integer-Cent: parseFloat/toFixed auf Beträgen führt zu Rundungsfehlern.
			'no-restricted-properties': [
				'error',
				{ property: 'toFixed', message: 'Beträge über formatCents() aus #lib/money formatieren.' }
			],
			'no-restricted-globals': [
				'error',
				{ name: 'parseFloat', message: 'Beträge über parseCents() aus #lib/money parsen.' }
			]
		}
	}
);
