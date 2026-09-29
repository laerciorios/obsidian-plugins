import { FORBIDDEN_NAME_CHARS, MAX_NAME_LENGTH } from '../constants';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import { nameKey } from '../palette';
import { normalizeHex } from '../syntax';
import type { ColorStyle, ColoredTextSettings, PaletteColor } from '../types';

interface DefaultColor {
	id: string;
	label: MessageKey;
	color: string;
	style: ColorStyle;
}

/** Office suites' standard colors. Yellow is unreadable as text, so it starts as a highlight. */
const DEFAULT_COLORS: DefaultColor[] = [
	{ id: 'dark-red', label: 'defaults.darkRed', color: '#c00000', style: 'text' },
	{ id: 'red', label: 'defaults.red', color: '#ff0000', style: 'text' },
	{ id: 'orange', label: 'defaults.orange', color: '#ffc000', style: 'text' },
	{ id: 'yellow', label: 'defaults.yellow', color: '#ffff00', style: 'background' },
	{ id: 'light-green', label: 'defaults.lightGreen', color: '#92d050', style: 'text' },
	{ id: 'green', label: 'defaults.green', color: '#00b050', style: 'text' },
	{ id: 'light-blue', label: 'defaults.lightBlue', color: '#00b0f0', style: 'text' },
	{ id: 'blue', label: 'defaults.blue', color: '#0070c0', style: 'text' },
	{ id: 'dark-blue', label: 'defaults.darkBlue', color: '#002060', style: 'text' },
	{ id: 'purple', label: 'defaults.purple', color: '#7030a0', style: 'text' },
];

const NEW_COLOR = '#808080';

/**
 * Written on first use. Names are translated here, once, and saved: they are
 * typed in notes, so switching the app language must not rename them.
 */
export function defaultSettings(): ColoredTextSettings {
	return {
		version: 1,
		colors: DEFAULT_COLORS.map(({ id, label, color, style }) => ({ id, name: t(label), color, style })),
		lastColor: 'red',
		editorMenu: true,
	};
}

export function nameError(name: string, colors: readonly PaletteColor[], selfId: string): string | null {
	const trimmed = name.trim();
	if (!trimmed) return t('validation.nameEmpty');
	if (trimmed.length > MAX_NAME_LENGTH) return t('validation.nameLength', { max: MAX_NAME_LENGTH });
	if (trimmed.startsWith('#')) return t('validation.nameHash');
	if (/[\n\t]/.test(trimmed) || FORBIDDEN_NAME_CHARS.some((char) => trimmed.includes(char))) {
		return t('validation.nameChars', { chars: FORBIDDEN_NAME_CHARS.join(' ') });
	}
	const key = nameKey(trimmed);
	if (colors.some((color) => color.id !== selfId && nameKey(color.name) === key)) return t('validation.nameTaken');
	return null;
}

export function hexError(value: string): string | null {
	return normalizeHex(value) ? null : t('validation.hex');
}

function newId(colors: readonly PaletteColor[]): string {
	const taken = new Set(colors.map((color) => color.id));
	const base = `color-${Date.now().toString(36)}`;
	let id = base;
	for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
	return id;
}

/** A new palette entry with a free name ("new-color", "new-color-2"...). */
export function newColor(colors: readonly PaletteColor[]): PaletteColor {
	const id = newId(colors);
	const base = t('defaults.newColor');
	let name = base;
	for (let n = 2; nameError(name, colors, id) && n < 1000; n++) name = `${base}-${n}`;
	return { id, name, color: NEW_COLOR, style: 'text' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One saved color, or null when it cannot be used (bad hex, invalid or repeated name). */
function normalizeColor(raw: unknown, taken: readonly PaletteColor[]): PaletteColor | null {
	if (!isRecord(raw)) return null;
	const color = typeof raw.color === 'string' ? normalizeHex(raw.color) : null;
	if (!color) return null;
	const savedId = typeof raw.id === 'string' ? raw.id : '';
	const id = savedId && !taken.some((other) => other.id === savedId) ? savedId : newId(taken);
	const name = typeof raw.name === 'string' ? raw.name.trim() : '';
	if (nameError(name, taken, id)) return null;
	return { id, name, color, style: raw.style === 'background' ? 'background' : 'text' };
}

/** Whether `loadData()` returned settings written by this plugin (not empty, not another plugin's). */
export function isOwnData(raw: unknown): boolean {
	return isRecord(raw) && raw.version === 1 && Array.isArray(raw.colors);
}

/** Accept anything `loadData()` returns: missing fields get defaults. */
export function normalizeSettings(raw: unknown): ColoredTextSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	let colors = defaults.colors;
	if (Array.isArray(raw.colors)) {
		colors = [];
		for (const item of raw.colors) {
			const color = normalizeColor(item, colors);
			if (color) colors.push(color);
		}
	}
	return {
		version: 1,
		colors,
		lastColor: typeof raw.lastColor === 'string' ? raw.lastColor : defaults.lastColor,
		editorMenu: typeof raw.editorMenu === 'boolean' ? raw.editorMenu : defaults.editorMenu,
	};
}
