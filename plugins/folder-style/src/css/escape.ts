/**
 * A CSS string literal, double-quoted. `CSS.escape` is meant for identifiers (and is missing
 * outside the browser); inside a string only quotes, backslashes and control characters need it.
 */
export function cssString(value: string): string {
	let out = '';
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		if (char === '"' || char === '\\') out += `\\${char}`;
		else if (code < 0x20 || code === 0x7f) out += `\\${code.toString(16)} `;
		else out += char;
	}
	return `"${out}"`;
}
