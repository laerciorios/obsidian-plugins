import type { FolderColor, PresetColor } from '../types';

/** `#rrggbb` in lowercase, from `rrggbb`, `#RGB`… Null when it is not a hex color. */
export function normalizeHex(value: string): string | null {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (!match?.[1]) return null;
	const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
	return `#${digits.toLowerCase()}`;
}

/** A theme color's channels: Obsidian's `--color-<name>-rgb` variable, following light and dark. */
export function presetChannels(preset: PresetColor): string {
	return `var(--color-${preset}-rgb)`;
}

/**
 * The color as `rgb()` channels, comma-separated like Obsidian's `--color-<name>-rgb`
 * variables (`233, 49, 71`), so presets and hex go through the same `rgba(…, alpha)`.
 * Null when a hex value is not a hex color.
 */
export function colorChannels(color: FolderColor): string | null {
	if (color.kind === 'preset') return presetChannels(color.value);
	const hex = normalizeHex(color.value);
	if (!hex) return null;
	return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ');
}

/** Alpha clamped to 0..1, without float noise (0.12 + 0.06 → 0.18). */
export function cssAlpha(value: number): string {
	return String(Number(Math.min(1, Math.max(0, value)).toFixed(3)));
}
