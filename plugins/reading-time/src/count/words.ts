/** Chinese and Japanese (kanji, hiragana) have no spaces between words: each character counts as one. */
const IDEOGRAPH = /[\p{Script=Han}\p{Script=Hiragana}]/gu;

/** Dots and commas between digits ("1.714", "3,14") keep a number in one word. No lookbehind: iOS < 16.4. */
const DIGIT_SEPARATOR = /(\p{N})[.,](?=\p{N})/gu;

/**
 * A run of letters, digits and marks. Hyphens, apostrophes and underscores inside
 * a run join it ("guarda-chuva", "don't", "snake_case").
 */
const WORD = /[\p{L}\p{N}\p{M}]+(?:['’_-][\p{L}\p{N}\p{M}]+)*/gu;

export function countWords(text: string): number {
	let ideographs = 0;
	const rest = text
		.replace(IDEOGRAPH, () => {
			ideographs++;
			return ' ';
		})
		.replace(DIGIT_SEPARATOR, '$1');
	return ideographs + (rest.match(WORD)?.length ?? 0);
}
