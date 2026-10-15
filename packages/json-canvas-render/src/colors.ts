/**
 * Colors of the light and dark themes. JSON Canvas leaves the preset colors to each application;
 * these are the values of Obsidian's default theme, so an export looks like the canvas.
 */

export type ThemeName = 'light' | 'dark';

export const PRESET_COLORS = ['1', '2', '3', '4', '5', '6'] as const;
export type PresetColor = (typeof PRESET_COLORS)[number];

export interface Theme {
	name: ThemeName;
	background: string;
	text: string;
	muted: string;
	faint: string;
	/** Border of cards and lines without a color (Obsidian's default --canvas-color). */
	stroke: string;
	accent: string;
	/** Background of code blocks and inline code. */
	code: string;
	/** Text over a solid preset or custom color (group labels): picked by lightness. */
	onLight: string;
	onDark: string;
	/** Red, orange, yellow, green, cyan, purple. */
	presets: Record<PresetColor, string>;
	/** Highlight (==text==) color before mixing with the background. */
	highlight: string;
}

export const THEMES: Record<ThemeName, Theme> = {
	light: {
		name: 'light',
		background: '#ffffff',
		text: '#222222',
		muted: '#5c5c5c',
		faint: '#ababab',
		stroke: '#c0c0c0',
		accent: '#8a5cf5',
		code: '#f6f6f6',
		onLight: '#222222',
		onDark: '#ffffff',
		presets: { '1': '#e93147', '2': '#ec7500', '3': '#e0ac00', '4': '#08b94e', '5': '#00bfbc', '6': '#7852ee' },
		highlight: '#e0ac00',
	},
	dark: {
		name: 'dark',
		background: '#1c1c1c',
		text: '#dadada',
		muted: '#b3b3b3',
		faint: '#666666',
		stroke: '#7e7e7e',
		accent: '#a68af9',
		code: '#282828',
		onLight: '#1c1c1c',
		onDark: '#ffffff',
		presets: { '1': '#fb464c', '2': '#e9973f', '3': '#e0de71', '4': '#44cf6e', '5': '#53dfdd', '6': '#a882ff' },
		highlight: '#e0de71',
	},
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Obsidian also accepts "r, g, b" in older files. */
const RGB = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;

interface Rgb {
	r: number;
	g: number;
	b: number;
}

function parseHex(color: string): Rgb | null {
	const match = HEX.exec(color.trim());
	if (!match?.[1]) return null;
	let hex = match[1];
	if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join('');
	return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function toHex({ r, g, b }: Rgb): string {
	const part = (value: number): string => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
	return `#${part(r)}${part(g)}${part(b)}`;
}

/** A canvas color as #rrggbb in a theme; null when missing or not a color. */
export function resolveColor(color: unknown, theme: Theme): string | null {
	if (typeof color !== 'string' || color.trim() === '') return null;
	const preset = theme.presets[color.trim() as PresetColor];
	if (preset) return preset;
	const rgb = RGB.exec(color);
	if (rgb) return toHex({ r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) });
	const hex = parseHex(color);
	return hex ? toHex(hex) : null;
}

/** `amount` of `color` over `base` (like CSS color-mix in srgb), as #rrggbb. */
export function mix(color: string, base: string, amount: number): string {
	const a = parseHex(color);
	const b = parseHex(base);
	if (!a || !b) return color;
	return toHex({
		r: a.r * amount + b.r * (1 - amount),
		g: a.g * amount + b.g * (1 - amount),
		b: a.b * amount + b.b * (1 - amount),
	});
}

/** Whether a color is light enough to need dark text on top. */
export function isLight(color: string): boolean {
	const rgb = parseHex(color);
	if (!rgb) return true;
	const channel = (value: number): number => {
		const c = value / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	const luminance = 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
	return luminance > 0.45;
}

/** Colors of one node or edge in a theme. */
export interface Paint {
	/** Stroke of the card outline or line. */
	stroke: string;
	strokeWidth: number;
	/** Fill of the card. */
	fill: string;
	/** Fill of a group's area (translucent tint). */
	tint: string;
	/** The color itself, or the default stroke. */
	color: string;
	themed: boolean;
}

/** Card and line colors as Obsidian draws them (colored cards: 70% border, 7% tint). */
export function paint(color: unknown, theme: Theme): Paint {
	const resolved = resolveColor(color, theme);
	if (!resolved) {
		return {
			stroke: theme.stroke,
			strokeWidth: 1,
			fill: theme.background,
			tint: mix(theme.stroke, theme.background, 0.07),
			color: theme.stroke,
			themed: false,
		};
	}
	return {
		stroke: mix(resolved, theme.background, 0.7),
		strokeWidth: 2,
		fill: mix(resolved, theme.background, 0.07),
		tint: mix(resolved, theme.background, 0.07),
		color: resolved,
		themed: true,
	};
}
