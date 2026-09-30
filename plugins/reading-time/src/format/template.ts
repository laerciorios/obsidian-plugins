/**
 * Custom format: a template with {variables}. Variable names are data typed by
 * the user (like frontmatter keys), the same in every language.
 */
export const VARIABLES = ['minutes', 'compact', 'simple', 'verbose', 'clock', 'words', 'wpm'] as const;

export type Variable = (typeof VARIABLES)[number];

const PLACEHOLDER = /\{([^{}\s]+)\}/g;

const isVariable = (name: string): name is Variable => (VARIABLES as readonly string[]).includes(name);

/** Unknown placeholders are kept as typed, so a typo shows up in the status bar. */
export function renderTemplate(template: string, values: Record<Variable, string>): string {
	return template.replace(PLACEHOLDER, (match, name: string) => (isVariable(name) ? values[name] : match));
}

export function unknownVariables(template: string): string[] {
	const names = new Set<string>();
	for (const match of template.matchAll(PLACEHOLDER)) {
		const name = match[1] ?? '';
		if (!isVariable(name)) names.add(name);
	}
	return [...names];
}
