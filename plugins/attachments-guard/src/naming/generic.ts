/**
 * Words that are noise in a file name: the "at"/"às" of screenshot and
 * WhatsApp names, and the "copy" of duplicated files.
 */
const FILLER = new Set(['at', 'as', 'copy', 'copia']);

/**
 * Comparison key of a file name or of an entry of the generic list: accents,
 * case, separators, numbers (dates, times, counters) and filler words removed.
 * "Captura de Tela 2025-04-17 às 07.48.25" → "captura de tela",
 * "IMG_1234" → "img", "image (2)" → "image", "20260425094013" → "".
 */
export function genericKey(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/\p{N}+/gu, ' ')
		.split(/[^\p{L}]+/u)
		.filter((word) => word && !FILLER.has(word))
		.join(' ');
}

/** Keys of the generic list, ready for {@link isGeneric}. */
export function genericKeys(names: readonly string[]): Set<string> {
	return new Set(names.map(genericKey).filter(Boolean));
}

/**
 * Whether a base name (without extension) says nothing about the file: it is
 * one of the generic names, apart from numbers and separators, or has no
 * letters at all.
 */
export function isGeneric(basename: string, keys: ReadonlySet<string>): boolean {
	const key = genericKey(basename);
	return key === '' || keys.has(key);
}
