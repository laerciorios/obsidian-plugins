import type { WordCounts } from '../types';
import { cleanProse } from './prose';
import { segment } from './segments';
import type { Segment } from './segments';
import { countWords } from './words';

export type { Segment } from './segments';

export interface Range {
	from: number;
	to: number;
}

/** A note split once into segments, measured as a whole or by ranges (selections). */
export class CountedText {
	readonly segments: Segment[];
	readonly total: WordCounts;

	constructor(
		readonly text: string,
		skipLanguages: ReadonlySet<string>,
	) {
		this.segments = segment(text, skipLanguages);
		this.total = this.count([{ from: 0, to: text.length }]);
	}

	count(ranges: readonly Range[]): WordCounts {
		const counts: WordCounts = { prose: 0, code: 0 };
		for (const range of ranges) {
			for (const part of this.segments) {
				if (part.kind === 'skip' || part.to <= range.from || part.from >= range.to) continue;
				const slice = this.text.slice(Math.max(part.from, range.from), Math.min(part.to, range.to));
				if (part.kind === 'prose') counts.prose += countWords(cleanProse(slice));
				else counts.code += countWords(slice);
			}
		}
		return counts;
	}
}

export function countText(text: string, skipLanguages: ReadonlySet<string>): WordCounts {
	return new CountedText(text, skipLanguages).total;
}
