/** Colors chosen in the settings: a theme preset (follows light/dark) or a fixed hex. */

/** Theme colors offered as presets; each has a `--color-<name>-rgb` variable. */
export const PRESET_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;
export type PresetColor = (typeof PRESET_COLORS)[number];

export type ColorSpec = { kind: 'preset'; value: PresetColor } | { kind: 'hex'; value: string };

/** "#rgb" or "#rrggbb" → 0xrrggbb; null when invalid. */
export function parseHex(hex: string): number | null {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) return null;
	let digits = match[1] ?? '';
	if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join('');
	return parseInt(digits, 16);
}

/** "233, 49, 71" (the theme's `--color-*-rgb` format) → 0xe93147; null when invalid. */
export function parseChannels(channels: string): number | null {
	const parts = channels.split(',').map((part) => Number(part.trim()));
	if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
	const [r = 0, g = 0, b = 0] = parts;
	return (r << 16) | (g << 8) | b;
}

/** The color as a number for PIXI tints, reading presets from the current theme. */
export function colorNumber(spec: ColorSpec, el: HTMLElement = document.body): number | null {
	if (spec.kind === 'hex') return parseHex(spec.value);
	return parseChannels(getComputedStyle(el).getPropertyValue(`--color-${spec.value}-rgb`));
}

/** The color as CSS, for swatches in the settings and the legend. */
export function colorCss(spec: ColorSpec): string {
	return spec.kind === 'hex' ? spec.value : `rgb(var(--color-${spec.value}-rgb))`;
}

export function readColor(value: unknown): ColorSpec | null {
	if (typeof value !== 'object' || value === null) return null;
	const raw = value as Record<string, unknown>;
	if (raw.kind === 'preset') {
		const preset = PRESET_COLORS.find((name) => name === raw.value);
		return preset ? { kind: 'preset', value: preset } : null;
	}
	if (raw.kind === 'hex' && typeof raw.value === 'string' && parseHex(raw.value) !== null) return { kind: 'hex', value: raw.value.trim() };
	return null;
}
