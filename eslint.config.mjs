// Shared ESLint config. Run it per plugin (`pnpm -r lint` → `eslint src` inside
// plugins/<id>/): eslint-plugin-obsidianmd reads ./manifest.json from the current
// directory to check minAppVersion, plugin name and id.
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

// Proper names that UI strings may keep capitalized (plugin names, core plugins, view names).
const BRANDS = ['Bases Board', 'Bases', 'Board', 'Obsidian'];

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
		rules: {
			'obsidianmd/ui/sentence-case': ['warn', { brands: BRANDS }],
		},
	},
);
