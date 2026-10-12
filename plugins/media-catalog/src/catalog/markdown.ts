/**
 * Line and heading helpers for the sections the plugin writes into notes
 * (`## Faixas`, `## Histórico`). Pure functions over strings.
 */

export interface Heading {
	/** Line index in the body. */
	index: number;
	level: number;
	/** Text without the `#` marks, trimmed and folded for comparison. */
	key: string;
}

export function fold(text: string): string {
	return text.normalize('NFC').toLowerCase();
}

/** ATX heading of one line (`## Faixas`, `## Faixas ##`), or null. */
export function parseHeading(line: string): { level: number; key: string } | null {
	const match = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(line);
	if (!match) return null;
	const text = (match[2] ?? '').replace(/(?:^|[ \t]+)#+$/, '').trim();
	return { level: (match[1] ?? '').length, key: fold(text) };
}

/** Folded text of a heading constant (`## Impressões` → `impressões`). */
export function headingKey(heading: string): string {
	return parseHeading(heading)?.key ?? '';
}

/** Lines of `text`, each with its own line ending (the last one may have none). */
export function splitLines(text: string): string[] {
	return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** Headings outside fenced code blocks. */
export function headingsOf(lines: readonly string[]): Heading[] {
	const headings: Heading[] = [];
	let fence: { char: string; length: number } | null = null;
	lines.forEach((raw, index) => {
		const line = raw.replace(/\r?\n$/, '');
		const marks = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (fence) {
			if (marks?.startsWith(fence.char) && marks.length >= fence.length && line.trim() === marks) fence = null;
			return;
		}
		if (marks) {
			fence = { char: marks.charAt(0), length: marks.length };
			return;
		}
		const heading = parseHeading(line);
		if (heading) headings.push({ index, ...heading });
	});
	return headings;
}

/** Length of the frontmatter block (`---` … `---` at the very start), 0 without one. */
export function frontmatterEnd(content: string): number {
	const match = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(content);
	return match ? match[0].length : 0;
}

/** True when `text` ends in a blank line (or is empty): the next block can start right away. */
function endsWithBlankLine(text: string): boolean {
	return text === '' || /\n[ \t]*\r?\n$/.test(text) || /^[ \t]*\r?\n$/.test(text);
}

/** `before` followed by what makes one blank line before the next block. */
export function spaced(before: string, eol: string): string {
	if (endsWithBlankLine(before)) return before;
	return before.endsWith('\n') ? before + eol : before + eol + eol;
}

/** The line ending a note uses: CRLF when it has one, else LF. */
export function eolOf(content: string): string {
	return content.includes('\r\n') ? '\r\n' : '\n';
}
