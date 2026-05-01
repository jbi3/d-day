import js from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		plugins: { perfectionist },
		rules: {
			'perfectionist/sort-imports': [
				'warn',
				{
					type: 'natural',
					order: 'asc',
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index']
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			// URLSearchParams here is built/parsed imperatively, not reactively.
			'svelte/prefer-svelte-reactivity': 'off',
			// SvelteKit base-path handling not relevant for static <a href="/">.
			'svelte/no-navigation-without-resolve': 'off',
			// False positives on init-then-conditionally-mutate patterns.
			'no-useless-assignment': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		// Svelte 5 `.svelte.ts` rune files are TypeScript — use the TS parser
		// (svelte-eslint-parser trips on TS parameter properties like
		// `public readonly start: number` in the constructor).
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: ts.parser
		}
	},
	{
		ignores: [
			'node_modules/',
			'.svelte-kit/',
			'apps/*/build/',
			'apps/*/.svelte-kit/',
			'**/dist/',
			'data/**/*.json',
			'inspiration/'
		]
	}
];
