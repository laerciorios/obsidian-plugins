/** Plugin settings (data.json). Values are data, never translated. */

export type ExportFormat = 'svg' | 'png';
export type ExportScope = 'canvas' | 'selection';
export type ExportTheme = 'light' | 'dark';
export type ExportBackground = 'transparent' | 'solid';
export type WebNotes = 'text' | 'link';

export interface ImageExportChoices {
	format: ExportFormat;
	scope: ExportScope;
	theme: ExportTheme;
	background: ExportBackground;
	scale: number;
}

export interface CanvasShapesSettings {
	version: 1;
	/** Last choices of the image export window. */
	image: ImageExportChoices;
	/** Theme of the web export's first view (the viewer can switch). */
	webTheme: 'system' | ExportTheme;
	/** Notes linked in a canvas: their text in a card, or a link to them. */
	webNotes: WebNotes;
	/** URL of a note when `webNotes` is `link`: {vault}, {path} and {name} are filled in. */
	webLinkTemplate: string;
	/** Vault folder for exports where there is no save window (mobile); empty: next to the canvas. */
	exportFolder: string;
}

export const SCALES = [1, 2, 3] as const;
export const DEFAULT_LINK_TEMPLATE = 'obsidian://open?vault={vault}&file={path}';

export function defaultSettings(): CanvasShapesSettings {
	return {
		version: 1,
		image: { format: 'png', scope: 'canvas', theme: 'light', background: 'solid', scale: 2 },
		webTheme: 'system',
		webNotes: 'text',
		webLinkTemplate: DEFAULT_LINK_TEMPLATE,
		exportFolder: '',
	};
}

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
	typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Settings from data.json, with defaults for anything missing or invalid. */
export function normalizeSettings(raw: unknown): CanvasShapesSettings {
	const defaults = defaultSettings();
	const data = isRecord(raw) ? raw : {};
	const image = isRecord(data.image) ? data.image : {};
	return {
		version: 1,
		image: {
			format: pick(image.format, ['svg', 'png'], defaults.image.format),
			scope: pick(image.scope, ['canvas', 'selection'], defaults.image.scope),
			theme: pick(image.theme, ['light', 'dark'], defaults.image.theme),
			background: pick(image.background, ['transparent', 'solid'], defaults.image.background),
			scale: (SCALES as readonly number[]).includes(image.scale as number) ? (image.scale as number) : defaults.image.scale,
		},
		webTheme: pick(data.webTheme, ['system', 'light', 'dark'], defaults.webTheme),
		webNotes: pick(data.webNotes, ['text', 'link'], defaults.webNotes),
		webLinkTemplate: typeof data.webLinkTemplate === 'string' && data.webLinkTemplate.trim() ? data.webLinkTemplate.trim() : defaults.webLinkTemplate,
		exportFolder: typeof data.exportFolder === 'string' ? cleanFolder(data.exportFolder) : '',
	};
}

/** A vault folder path without leading/trailing slashes ("" is the vault root or "next to"). */
export function cleanFolder(value: string): string {
	return value.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

/** Fill a link template for a note (`path` is the vault path). */
export function noteLink(template: string, vault: string, path: string): string {
	const name = (path.split('/').pop() ?? path).replace(/\.md$/i, '');
	return template
		.replace(/\{vault\}/g, encodeURIComponent(vault))
		.replace(/\{path\}/g, encodeURIComponent(path))
		.replace(/\{name\}/g, encodeURIComponent(name));
}
