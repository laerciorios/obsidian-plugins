/**
 * The comments file of a note: plain markdown that people and AI agents read
 * and edit without the plugin. One `##` section per anchor (a block id in the
 * note), with a status line, the quoted passage and one `###` per message:
 *
 *   ---
 *   note: "[[Work/Acme/kickoff|kickoff]]"
 *   ---
 *   ## [[Work/Acme/kickoff#^c-4f2a|c-4f2a]]
 *   status: open
 *
 *   > The quoted passage.
 *
 *   ### me · 2026-09-29 14:30
 *   The comment.
 *
 * Everything here is data: keys, values and structure are never translated.
 * Reading is lenient (`## c-4f2a`, `### ai` without a date), so a file edited
 * by hand still works. Writing lives in edit.ts.
 */

export type ThreadStatus = 'open' | 'resolved';

export interface Message {
	author: string;
	/** As written, usually "YYYY-MM-DD HH:mm"; null when the heading has no date. */
	date: string | null;
	/** Passage quoted by this message: a later comment on another part of the block. */
	quote: string;
	body: string;
}

export interface Thread {
	/** Block id in the note, without the caret. */
	anchor: string;
	status: ThreadStatus;
	quote: string;
	messages: Message[];
}

export interface CommentsDoc {
	/** Link target of the `note` property: no brackets, alias or subpath. */
	note: string | null;
	threads: Thread[];
}

const FENCE = /^\s*(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})(?:\s+(.*))?$/;
const ESCAPED_HEADING = /^\\(#{1,6}(?:\s|$))/;
export const STATUS_LINE = /^status:\s*(\S*)/i;
const QUOTE_LINE = /^>\s?(.*)$/;
const LINKED_ANCHOR = /#\^([A-Za-z0-9-]+)/;
const PLAIN_ANCHOR = /^\^?([A-Za-z0-9-]+)$/;
const MESSAGE_HEADING = /^(.*?)\s*[·•|—–-]\s*(\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2})?)$/;

export function splitLines(text: string): string[] {
	return text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
}

/** Index of the first body line: after the frontmatter, when there is one. */
function frontmatterEnd(lines: readonly string[]): number {
	if (lines[0] !== '---') return 0;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i] === '---' || lines[i] === '...') return i + 1;
	}
	return 0;
}

function noteLink(frontmatter: readonly string[]): string | null {
	for (const line of frontmatter) {
		const match = /^note:\s*(.*)$/.exec(line);
		if (!match) continue;
		const value = (match[1] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
		const link = /\[\[([^\]|#]+)/.exec(value)?.[1] ?? value;
		return link.trim() || null;
	}
	return null;
}

/** Heading level of each line (0 for text), ignoring "#" inside fenced code. */
function headingLevels(lines: readonly string[], from: number): number[] {
	const levels = lines.map(() => 0);
	let fence: string | null = null;
	for (let i = from; i < lines.length; i++) {
		const line = lines[i] ?? '';
		const marker = FENCE.exec(line)?.[1];
		if (fence) {
			if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
			continue;
		}
		if (marker) {
			fence = marker;
			continue;
		}
		const heading = HEADING.exec(line);
		if (heading) levels[i] = heading[1]?.length ?? 0;
	}
	return levels;
}

function headingText(line: string): string {
	return (HEADING.exec(line)?.[2] ?? '').trim();
}

/** The anchor named by a `##` heading: `[[note#^id|…]]`, `^id` or a bare id. */
export function anchorOfHeading(text: string): string | null {
	return LINKED_ANCHOR.exec(text)?.[1] ?? PLAIN_ANCHOR.exec(text)?.[1] ?? null;
}

export function sameAnchor(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase();
}

export interface Section {
	anchor: string;
	/** Line of the `##` heading. */
	from: number;
	/** First line after the section. */
	to: number;
}

export interface Layout {
	lines: string[];
	levels: number[];
	sections: Section[];
}

/** Lines, heading levels and thread sections of a comments file. */
export function layoutOf(text: string): Layout {
	const lines = splitLines(text);
	const body = frontmatterEnd(lines);
	const levels = headingLevels(lines, body);
	const sections: Section[] = [];
	let open: Section | null = null;
	for (let i = body; i < lines.length; i++) {
		const level = levels[i] ?? 0;
		if (level === 0 || level > 2) continue;
		if (open) open.to = i;
		const anchor = level === 2 ? anchorOfHeading(headingText(lines[i] ?? '')) : null;
		open = anchor ? { anchor, from: i, to: lines.length } : null;
		if (open) sections.push(open);
	}
	return { lines, levels, sections };
}

/** Lines of a body without the leading and trailing blank lines. */
function trimBlank(lines: readonly string[]): string[] {
	let from = 0;
	let to = lines.length;
	while (from < to && !lines[from]?.trim()) from++;
	while (to > from && !lines[to - 1]?.trim()) to--;
	return lines.slice(from, to);
}

/** Headings in a comment would split the section: they are written as "\#". */
function mapOutsideFences(lines: readonly string[], map: (line: string) => string): string[] {
	let fence: string | null = null;
	return lines.map((line) => {
		const marker = FENCE.exec(line)?.[1];
		if (fence) {
			if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
			return line;
		}
		if (marker) {
			fence = marker;
			return line;
		}
		return map(line);
	});
}

export function escapeBody(body: string): string[] {
	return mapOutsideFences(splitLines(body), (line) => (HEADING.test(line) ? `\\${line}` : line));
}

function unescapeBody(lines: readonly string[]): string[] {
	return mapOutsideFences(lines, (line) => line.replace(ESCAPED_HEADING, '$1'));
}

function parseMessageHeading(text: string): { author: string; date: string | null } {
	const match = MESSAGE_HEADING.exec(text);
	const author = (match ? match[1] ?? '' : text).replace(/^[*_]+|[*_]+$/g, '').trim();
	return { author, date: match?.[2] ?? null };
}

function parseMessage(heading: string, lines: readonly string[]): Message {
	const { author, date } = parseMessageHeading(heading);
	const content = trimBlank(lines);
	const quote: string[] = [];
	let start = 0;
	for (; start < content.length; start++) {
		const match = QUOTE_LINE.exec(content[start] ?? '');
		if (!match) break;
		quote.push(match[1] ?? '');
	}
	return { author, date, quote: quote.join('\n').trim(), body: unescapeBody(trimBlank(content.slice(start))).join('\n') };
}

function parseSection(layout: Layout, section: Section): Thread {
	const { lines, levels } = layout;
	let status: ThreadStatus = 'open';
	const quote: string[] = [];
	let quoteClosed = false;
	const messages: Message[] = [];
	let message: { heading: string; lines: string[] } | null = null;
	const flush = () => {
		if (message) messages.push(parseMessage(message.heading, message.lines));
	};
	for (let i = section.from + 1; i < section.to; i++) {
		const line = lines[i] ?? '';
		if (levels[i] === 3) {
			flush();
			message = { heading: headingText(line), lines: [] };
			continue;
		}
		if (message) {
			message.lines.push(line);
			continue;
		}
		const statusMatch = STATUS_LINE.exec(line);
		if (statusMatch) {
			status = statusMatch[1]?.toLowerCase() === 'resolved' ? 'resolved' : 'open';
			continue;
		}
		const quoteMatch = QUOTE_LINE.exec(line);
		if (quoteMatch && !quoteClosed) {
			quote.push(quoteMatch[1] ?? '');
			continue;
		}
		if (quote.length > 0) quoteClosed = true;
	}
	flush();
	return { anchor: section.anchor, status, quote: quote.join('\n').trim(), messages };
}

/**
 * Read a comments file. Two sections with the same anchor (a hand edit) show
 * as one thread; writes go to the first one.
 */
export function parseComments(text: string): CommentsDoc {
	const layout = layoutOf(text);
	const note = noteLink(layout.lines.slice(0, frontmatterEnd(layout.lines)));
	const threads: Thread[] = [];
	for (const section of layout.sections) {
		const thread = parseSection(layout, section);
		const same = threads.find((other) => sameAnchor(other.anchor, thread.anchor));
		if (same) same.messages.push(...thread.messages);
		else threads.push(thread);
	}
	return { note, threads };
}

export function findThread(doc: CommentsDoc, anchor: string): Thread | null {
	return doc.threads.find((thread) => sameAnchor(thread.anchor, anchor)) ?? null;
}
