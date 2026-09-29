/**
 * Tiny, deterministic YAML writer for new notes. It reproduces the style of
 * the existing catalog (`title: "…"`, `rating:` for null, dates and URLs
 * unquoted, `tags: [entertainment]`), which stringifyYaml does not. Only flat
 * `key: value` lines; updates to existing notes go through processFrontMatter.
 */

export type YamlValue =
	| { type: 'quoted'; value: string }
	| { type: 'plain'; value: string }
	| { type: 'number'; value: number }
	| { type: 'boolean'; value: boolean }
	| { type: 'null' }
	| { type: 'list'; items: readonly string[] };

export type YamlEntry = readonly [key: string, value: YamlValue];

export const yaml = {
	/** Always double-quoted: `"Barbie"`, `""`. */
	quoted: (value: string): YamlValue => ({ type: 'quoted', value }),
	/** Unquoted when that is safe (`movie`, `2023-07-20`, an URL); quoted otherwise. */
	plain: (value: string): YamlValue => ({ type: 'plain', value }),
	/** Literal number; null when not finite. */
	number: (value: number | null): YamlValue =>
		value !== null && Number.isFinite(value) ? { type: 'number', value } : { type: 'null' },
	boolean: (value: boolean): YamlValue => ({ type: 'boolean', value }),
	/** `key:` with nothing after the colon. */
	null: (): YamlValue => ({ type: 'null' }),
	/** Flow list: `[entertainment]`. */
	list: (items: readonly string[]): YamlValue => ({ type: 'list', items }),
};

const ESCAPES: Record<string, string> = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
// eslint-disable-next-line no-control-regex -- control characters are what gets escaped
const CONTROL = /[\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex -- same set, plus backslash and quote
const TO_ESCAPE = /[\\"\u0000-\u001f\u007f]/g;

/** Double-quoted YAML scalar. Backslashes, quotes and control characters are escaped. */
export function quote(value: string): string {
	const escaped = value.replace(TO_ESCAPE, (char) => {
		return ESCAPES[char] ?? `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
	});
	return `"${escaped}"`;
}

/** Words YAML would read as booleans or null instead of text. */
const RESERVED = /^(?:true|false|yes|no|on|off|y|n|null|~)$/i;
const NUMERIC = /^[-+]?(?:\.?\d[\d_]*(?:\.\d*)?(?:e[-+]?\d+)?|\.inf|\.nan|0x[\da-f]+|0o[0-7]+)$/i;

/** True when `value` reads back as the same string without quotes (block context). */
export function isPlainSafe(value: string): boolean {
	if (!value || RESERVED.test(value) || NUMERIC.test(value)) return false;
	// Indicators that change the meaning of the first character.
	if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(value)) return false;
	// Whitespace, comments, quotes, "key: value" and a trailing colon.
	return !/[\s#'"]|:$/.test(value) && !CONTROL.test(value);
}

/** Items inside `[…]` also cannot contain the flow indicators. */
function listItem(item: string): string {
	return isPlainSafe(item) && !/[,[\]{}]/.test(item) ? item : quote(item);
}

function renderValue(value: YamlValue): string {
	switch (value.type) {
		case 'quoted':
			return quote(value.value);
		case 'plain':
			return isPlainSafe(value.value) ? value.value : quote(value.value);
		case 'number':
			return String(value.value);
		case 'boolean':
			return value.value ? 'true' : 'false';
		case 'null':
			return '';
		case 'list':
			return `[${value.items.map(listItem).join(', ')}]`;
	}
}

/** One `key: value` line per entry, each ending in "\n". Keys are written as given. */
export function renderYaml(entries: readonly YamlEntry[]): string {
	return entries
		.map(([key, value]) => {
			const rendered = renderValue(value);
			return rendered ? `${key}: ${rendered}\n` : `${key}:\n`;
		})
		.join('');
}

/** A whole frontmatter block, `---` lines included. */
export function renderFrontmatterBlock(entries: readonly YamlEntry[]): string {
	return `---\n${renderYaml(entries)}---\n`;
}
