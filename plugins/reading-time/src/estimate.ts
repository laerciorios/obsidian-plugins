import type { CodeSettings, Estimate, WordCounts } from './types';

export interface Speeds {
	wordsPerMinute: number;
	code: CodeSettings;
}

export function estimate(counts: WordCounts, speeds: Speeds): Estimate {
	const { mode, wordsPerMinute: codeSpeed } = speeds.code;
	const words = counts.prose + (mode === 'text' ? counts.code : 0);
	const codeWords = mode === 'speed' ? counts.code : 0;
	const exact = (words / speeds.wordsPerMinute + codeWords / codeSpeed) * 60;
	return {
		words,
		codeWords,
		ignoredCodeWords: mode === 'ignore' ? counts.code : 0,
		// Nearest second, but a single word still takes one: "1 min", never "0 min".
		seconds: exact > 0 ? Math.max(1, Math.round(exact)) : 0,
	};
}

/** Whole minutes, rounded up: "1 min" as soon as there is anything to read. Also the property value. */
export function wholeMinutes(estimate: Estimate): number {
	return Math.ceil(estimate.seconds / 60);
}

export function sum(a: WordCounts, b: WordCounts): WordCounts {
	return { prose: a.prose + b.prose, code: a.code + b.code };
}
