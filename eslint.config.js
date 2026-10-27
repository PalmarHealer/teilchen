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
		// UI rule: only text and number inputs stay native; everything else uses #lib/components.
		files: ['**/*.svelte'],
		rules: {
			'svelte/no-restricted-html-elements': [
				'error',
				{ elements: ['select', 'datalist'], message: 'Use #lib/components/Select.svelte.' }
			],
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"SvelteAttribute[key.name='type'] > SvelteLiteral[value=/^(date|time|datetime-local|month|week|color|range)$/]",
					message: 'Use a custom component (e.g. #lib/components/DatePicker.svelte).'
				}
			]
		}
	},
	{
		// Server code also runs in the worker (tsx, no Vite): no SvelteKit virtual modules there.
		files: ['src/lib/server/**', 'src/worker/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{ group: ['$env/*'], message: 'Use process.env (the worker has no Vite).' },
						{ group: ['$app/*'], message: 'Not available in the worker.' }
					]
				}
			]
		}
	},
	{
		rules: {
			'no-undef': 'off',
			// No base path in use; resolve() on every link would just be noise.
			'svelte/no-navigation-without-resolve': 'off',
			// Money only as integer cents: parseFloat/toFixed on amounts causes rounding errors.
			'no-restricted-properties': [
				'error',
				{
					property: 'toFixed',
					message: 'Format amounts with i18n.money() / formatMoney() from #lib/i18n.'
				}
			],
			'no-restricted-globals': [
				'error',
				{ name: 'parseFloat', message: 'Parse amounts with parseCents() from #lib/money.' }
			]
		}
	}
);
