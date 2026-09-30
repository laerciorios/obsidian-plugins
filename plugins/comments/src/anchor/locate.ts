import { blockOfId, classify, idsIn } from './blocks';

/** A span of the note text, as character offsets. */
export interface Span {
	from: number;
	to: number;
}

/** Where a thread lives in the note text. */
export interface Location {
	/** The anchored block, without its id. */
	block: Span;
	/** The "^id" text. */
	id: Span;
	/** What to highlight: the quotes found inside the block, or the whole block. */
	highlights: Span[];
}

export interface LocateRequest {
	anchor: string;
	/** Quoted passages of the thread (the first comment's and later ones); empty strings are skipped. */
	quotes: readonly string[];
}

function lineOffsets(lines: readonly string[]): number[] {
	const offsets: number[] = [];
	let offset = 0;
	for (const line of lines) {
		offsets.push(offset);
		offset += line.length + 1;
	}
	return offsets;
}

/** A quote can run past the block, over its id: highlight around the id. */
function around(span: Span, id: Span): Span[] {
	if (span.to <= id.from || span.from >= id.to) return [span];
	return [
		{ from: span.from, to: id.from },
		{ from: id.to, to: span.to },
	].filter((part) => part.to > part.from);
}

function findQuote(text: string, quote: string, block: Span): Span | null {
	const candidates = [quote, quote.split('\n')[0] ?? ''].map((candidate) => candidate.trim()).filter(Boolean);
	for (const candidate of candidates) {
		const from = text.indexOf(candidate, block.from);
		if (from >= 0 && from < block.to) return { from, to: from + candidate.length };
	}
	return null;
}

/** Where each anchor is in the note; anchors missing from the text (orphans) are left out. */
export function locate(text: string, requests: readonly LocateRequest[]): Map<string, Location> {
	const found = new Map<string, Location>();
	if (requests.length === 0) return found;
	const doc = classify(text.split('\n'));
	const ids = idsIn(doc);
	const offsets = lineOffsets(doc.lines);
	for (const request of requests) {
		const position = ids.get(request.anchor.toLowerCase());
		if (!position) continue;
		const block = blockOfId(doc, position);
		const lineStart = offsets[position.line] ?? 0;
		const id = { from: lineStart + position.from, to: lineStart + position.to };
		let span: Span;
		if (position.alone && block) {
			span = { from: offsets[block.from] ?? 0, to: (offsets[block.to] ?? 0) + (doc.lines[block.to]?.length ?? 0) };
		} else {
			const from = block ? offsets[block.from] ?? lineStart : lineStart;
			const before = doc.lines[position.line]?.slice(0, position.from) ?? '';
			span = { from, to: lineStart + before.trimEnd().length };
		}
		const highlights: Span[] = [];
		for (const quote of request.quotes) {
			const match = findQuote(text, quote, span);
			if (match) highlights.push(...around(match, id));
		}
		found.set(request.anchor.toLowerCase(), {
			block: span,
			id,
			highlights: highlights.length > 0 ? highlights : [span].filter((part) => part.to > part.from),
		});
	}
	return found;
}

/** Lower-case ids of every block id in the note. */
export function anchorsIn(text: string): Set<string> {
	return new Set(idsIn(classify(text.split('\n'))).keys());
}
