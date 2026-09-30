/**
 * Split a note into what is read as prose, what is code, and what is never read
 * (frontmatter, fence lines, comments, skipped languages). Offsets point into the
 * original text, so a selection can be measured against the same segments.
 */

export type SegmentKind = 'prose' | 'code' | 'skip';

export interface Segment {
	kind: SegmentKind;
	from: number;
	to: number;
}

interface Fence {
	char: string;
	length: number;
	kind: SegmentKind;
}

type Comment = '%%' | '<!--';

const COMMENT_CLOSE: Record<Comment, string> = { '%%': '%%', '<!--': '-->' };

/** Opening fence, also inside blockquotes and callouts: indent, `>` markers, ``` or ~~~, info string. */
const FENCE_OPEN = /^[ \t]*(?:>[ \t]*)*(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^[ \t]*(?:>[ \t]*)*(`{3,}|~{3,})[ \t]*$/;
const MATH_OPEN = /^[ \t]*(?:>[ \t]*)*\$\$/;
const FRONTMATTER_OPEN = /^\uFEFF?---[ \t]*\r?\n/;
const FRONTMATTER_CLOSE = /^---[ \t]*\r?$/;

/** End offset of the frontmatter block (0 when the note has none). */
export function frontmatterEnd(text: string): number {
	const open = FRONTMATTER_OPEN.exec(text);
	if (!open) return 0;
	let pos = open[0].length;
	while (pos < text.length) {
		const nl = text.indexOf('\n', pos);
		const end = nl < 0 ? text.length : nl;
		if (FRONTMATTER_CLOSE.test(text.slice(pos, end))) return nl < 0 ? text.length : nl + 1;
		pos = end + 1;
	}
	return 0;
}

function openFence(line: string, skip: ReadonlySet<string>): Fence | null {
	const match = FENCE_OPEN.exec(line);
	if (!match) return null;
	const marker = match[1] ?? '';
	const info = match[2] ?? '';
	// ```code``` on one line is inline code, not a fence.
	if (marker.startsWith('`') && info.includes('`')) return null;
	const language = info.trim().split(/[\s{]/)[0]?.toLowerCase() ?? '';
	return { char: marker.charAt(0), length: marker.length, kind: skip.has(language) ? 'skip' : 'code' };
}

function closesFence(line: string, fence: Fence): boolean {
	const marker = FENCE_CLOSE.exec(line)?.[1];
	return !!marker && marker.charAt(0) === fence.char && marker.length >= fence.length;
}

export function segment(text: string, skipLanguages: ReadonlySet<string>): Segment[] {
	const out: Segment[] = [];
	const push = (kind: SegmentKind, from: number, to: number): void => {
		if (to <= from) return;
		const last = out[out.length - 1];
		if (last && last.kind === kind && last.to === from) last.to = to;
		else out.push({ kind, from, to });
	};

	let pos = frontmatterEnd(text);
	push('skip', 0, pos);
	let fence: Fence | null = null;
	let math = false;
	let comment: Comment | null = null;

	/** A prose line: comments (`%% %%`, `<!-- -->`) may open and close anywhere, across lines. */
	const scanProse = (line: string, start: number, next: number): void => {
		let i = 0;
		while (i < line.length) {
			if (comment) {
				const close = COMMENT_CLOSE[comment];
				const at = line.indexOf(close, i);
				if (at < 0) break;
				push('skip', start + i, start + at + close.length);
				i = at + close.length;
				comment = null;
				continue;
			}
			const percent = line.indexOf('%%', i);
			const html = line.indexOf('<!--', i);
			const at = percent < 0 ? html : html < 0 ? percent : Math.min(percent, html);
			if (at < 0) break;
			push('prose', start + i, start + at);
			comment = at === percent ? '%%' : '<!--';
			i = at + comment.length;
		}
		push(comment ? 'skip' : 'prose', start + i, next);
	};

	while (pos < text.length) {
		const nl = text.indexOf('\n', pos);
		const end = nl < 0 ? text.length : nl;
		const next = nl < 0 ? text.length : nl + 1;
		const line = text.slice(pos, end);

		if (fence) {
			if (closesFence(line, fence)) {
				push('skip', pos, next);
				fence = null;
			} else {
				push(fence.kind, pos, next);
			}
			pos = next;
			continue;
		}
		if (math) {
			push('code', pos, next);
			if (line.includes('$$')) math = false;
			pos = next;
			continue;
		}

		fence = comment ? null : openFence(line, skipLanguages);
		if (fence) {
			push('skip', pos, next);
		} else if (!comment && MATH_OPEN.test(line)) {
			push('code', pos, next);
			// "$$x$$" on one line is a whole block.
			const opening = line.indexOf('$$');
			math = !line.includes('$$', opening + 2);
		} else {
			scanProse(line, pos, next);
		}
		pos = next;
	}
	return out;
}
