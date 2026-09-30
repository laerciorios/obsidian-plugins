import { ID_ALPHABET, ID_LENGTH, ID_PREFIX } from '../constants';

/** A new anchor id ("c-4f2a") that `taken` does not reject. */
export function newAnchorId(taken: (id: string) => boolean): string {
	for (let length = ID_LENGTH; ; length++) {
		// Grow the id only after many collisions: a note would need thousands of comments.
		for (let attempt = 0; attempt < 50; attempt++) {
			let id = ID_PREFIX;
			for (let i = 0; i < length; i++) id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)] ?? '0';
			if (!taken(id)) return id;
		}
	}
}
