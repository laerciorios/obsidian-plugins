import { isHex, normalizeHex } from './syntax';
import type { PaletteColor, ResolvedColor } from './types';

/** Lowercase, accents removed, trimmed: "Correção" and "correcao" are the same color. */
export function nameKey(name: string): string {
	return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * Read-only view of the configured colors, rebuilt after every settings
 * change. Resolves the token of a marker: a palette name (case and accents
 * ignored) or a hex code, which is drawn as text color.
 */
export class Palette {
	private readonly byName = new Map<string, PaletteColor>();

	constructor(readonly colors: readonly PaletteColor[]) {
		for (const color of colors) {
			const key = nameKey(color.name);
			if (key && !this.byName.has(key)) this.byName.set(key, color);
		}
	}

	find(token: string): PaletteColor | null {
		return this.byName.get(nameKey(token)) ?? null;
	}

	resolve(token: string): ResolvedColor | null {
		if (isHex(token)) {
			const color = normalizeHex(token);
			return color ? { color, style: 'text' } : null;
		}
		const found = this.find(token);
		return found ? { color: found.color, style: found.style } : null;
	}

	/** A token the commands may replace or remove: only markers this palette understands. */
	isMarker = (token: string): boolean => this.resolve(token) !== null;

	/** Marker for a stored "last color" (palette id or hex); null when that color was removed. */
	tokenFor(value: string): string | null {
		if (isHex(value)) return normalizeHex(value);
		return this.colors.find((color) => color.id === value)?.name ?? null;
	}

	/** What to store as the "last color" after applying a token: the palette id survives renames. */
	memoryFor(token: string): string | null {
		if (isHex(token)) return normalizeHex(token);
		return this.find(token)?.id ?? null;
	}
}
