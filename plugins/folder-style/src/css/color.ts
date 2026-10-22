import type { FolderColor } from '../types';

/**
 * The color as `rgb()` channels, comma-separated like Obsidian's `--color-<name>-rgb`
 * variables (`233, 49, 71`), so presets and hex go through the same `rgba(…, alpha)`.
 * Null when a hex value is not `#rgb` or `#rrggbb`.
 */
export function colorChannels(color: FolderColor): string | null {
	if (color.kind === 'preset') return `var(--color-${color.value}-rgb)`;
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.value.trim());
	if (!match?.[1]) return null;
	const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
	return [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)).join(', ');
}

/** Alpha clamped to 0..1, without float noise (0.12 + 0.06 → 0.18). */
export function cssAlpha(value: number): string {
	return String(Number(Math.min(1, Math.max(0, value)).toFixed(3)));
}
