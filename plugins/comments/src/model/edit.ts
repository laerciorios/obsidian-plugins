import { STATUS_LINE, escapeBody, layoutOf, sameAnchor, splitLines } from './format';
import type { Layout, Section, ThreadStatus } from './format';

/**
 * Writes to a comments file (format in format.ts). Surgical, one section at a
 * time: text the plugin does not understand survives, and so do edits made by
 * hand or by an AI agent between two writes.
 */

/** A message about to be written. */
export interface NewMessage {
	author: string;
	date: string;
	quote?: string;
	body: string;
}

/** The note a comments file belongs to. */
export interface NoteTarget {
	/** Vault path without the ".md" extension: links by full path never become ambiguous. */
	path: string;
	name: string;
}

function cleanAuthor(author: string): string {
	return author.replace(/\s+/g, ' ').trim();
}

function quoteLines(quote: string): string[] {
	return splitLines(quote).map((line) => (line ? `> ${line}` : '>'));
}

function messageLines(message: NewMessage): string[] {
	const lines = [`### ${cleanAuthor(message.author)} · ${message.date}`];
	if (message.quote) lines.push(...quoteLines(message.quote), '');
	lines.push(...escapeBody(message.body.trim()));
	return lines;
}

function threadLines(target: NoteTarget, anchor: string, quote: string, message: NewMessage): string[] {
	const lines = [`## [[${target.path}#^${anchor}|${anchor}]]`, 'status: open', ''];
	if (quote) lines.push(...quoteLines(quote), '');
	lines.push(...messageLines(message));
	return lines;
}

/** A new comments file with its first thread. */
export function newCommentsFile(target: NoteTarget, anchor: string, quote: string, message: NewMessage): string {
	return ['---', `note: "[[${target.path}|${target.name}]]"`, '---', ...threadLines(target, anchor, quote, message), ''].join('\n');
}

/** Add a thread at the end of the file. */
export function appendThread(text: string, target: NoteTarget, anchor: string, quote: string, message: NewMessage): string {
	const kept = text.replace(/\s+$/, '');
	const section = threadLines(target, anchor, quote, message).join('\n');
	return kept ? `${kept}\n\n${section}\n` : `${section}\n`;
}

/** Insert lines at the end of a section, keeping one blank line before the next one. */
function insertAtEnd(layout: Layout, section: Section, insert: readonly string[]): string {
	const { lines } = layout;
	let end = section.to;
	while (end > section.from + 1 && !lines[end - 1]?.trim()) end--;
	const rest = lines.slice(end);
	if (rest.length === 0) rest.push('');
	else if (rest[0]?.trim()) rest.unshift('');
	return [...lines.slice(0, end), '', ...insert, ...rest].join('\n');
}

/** Add a message to the thread of `anchor`; null when the file has no such thread. */
export function appendMessage(text: string, anchor: string, message: NewMessage): string | null {
	const layout = layoutOf(text);
	const section = layout.sections.find((candidate) => sameAnchor(candidate.anchor, anchor));
	return section ? insertAtEnd(layout, section, messageLines(message)) : null;
}

/** Set the status line of the thread of `anchor`; null when the file has no such thread. */
export function setStatus(text: string, anchor: string, status: ThreadStatus): string | null {
	const layout = layoutOf(text);
	const section = layout.sections.find((candidate) => sameAnchor(candidate.anchor, anchor));
	if (!section) return null;
	const lines = [...layout.lines];
	const line = `status: ${status}`;
	for (let i = section.from + 1; i < section.to && layout.levels[i] !== 3; i++) {
		if (STATUS_LINE.test(lines[i] ?? '')) {
			lines[i] = line;
			return lines.join('\n');
		}
	}
	lines.splice(section.from + 1, 0, line);
	return lines.join('\n');
}
