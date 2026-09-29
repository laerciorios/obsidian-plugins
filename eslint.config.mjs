// Shared ESLint config. Run it per plugin (`pnpm -r lint` → `eslint src` inside
// plugins/<id>/): eslint-plugin-obsidianmd reads ./manifest.json from the current
// directory to check minAppVersion, plugin name and id.
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

// Proper names that UI strings may keep capitalized (plugin names, core plugins, view names).
const BRANDS = [
	'Bases Board',
	'Bases',
	'Board',
	'Obsidian',
	'Media Catalog',
	'IMDb',
	'TVmaze',
	'IGDB',
	'Google Books',
	'Google Cloud',
	'Open Library',
	'Twitch',
];

export default defineConfig(
	globalIgnores([
		'**/node_modules',
		'**/dist',
		'**/main.js',
		'dev-vault',
		'templates',
		'scripts',
		'**/*.mjs',
		'**/*.json',
	]),
	{
		files: ['plugins/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// Provided by Obsidian at runtime, never bundled (the externals in scripts/esbuild.mjs).
		// Their types come from the root devDependencies.
		settings: {
			'import/core-modules': [
				'obsidian',
				'electron',
				'@codemirror/autocomplete',
				'@codemirror/collab',
				'@codemirror/commands',
				'@codemirror/language',
				'@codemirror/lint',
				'@codemirror/search',
				'@codemirror/state',
				'@codemirror/view',
				'@lezer/common',
				'@lezer/highlight',
				'@lezer/lr',
			],
		},
	},
	{
		rules: {
			'obsidianmd/ui/sentence-case': ['warn', { brands: BRANDS }],
		},
	},
);
