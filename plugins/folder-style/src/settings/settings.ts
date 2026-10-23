import { PRESET_COLORS } from '../constants';
import { colorChannels } from '../css/color';
import type { FolderColor, FolderStyle, FolderStyleSettings, FolderSymbol } from '../types';

export const OPACITY_RANGE = { min: 0, max: 0.5 };
export const SYMBOL_SIZE_RANGE = { min: 0.5, max: 2 };

export function defaultSettings(): FolderStyleSettings {
	return { version: 1, opacity: 0.12, tintChildren: true, symbolSize: 1, folders: {} };
}

/**
 * `data.json` as saved (or nothing, on first run) → valid settings. Each value is checked on
 * its own: a wrong option falls back to its default, a broken symbol or color is dropped,
 * and folders left with neither are dropped too.
 */
export function normalizeSettings(saved: unknown): FolderStyleSettings {
	const settings = defaultSettings();
	if (!isRecord(saved)) return settings;
	settings.opacity = clamped(saved.opacity, OPACITY_RANGE) ?? settings.opacity;
	settings.symbolSize = clamped(saved.symbolSize, SYMBOL_SIZE_RANGE) ?? settings.symbolSize;
	if (typeof saved.tintChildren === 'boolean') settings.tintChildren = saved.tintChildren;
	if (isRecord(saved.folders)) {
		for (const [path, entry] of Object.entries(saved.folders)) {
			const style = folderStyle(entry);
			if (path !== '' && path !== '/' && style) settings.folders[path] = style;
		}
	}
	return settings;
}

function folderStyle(entry: unknown): FolderStyle | null {
	if (!isRecord(entry)) return null;
	const style: FolderStyle = {};
	const symbol = folderSymbol(entry.symbol);
	const color = folderColor(entry.color);
	if (symbol) style.symbol = symbol;
	if (color) style.color = color;
	return symbol || color ? style : null;
}

function folderSymbol(value: unknown): FolderSymbol | null {
	if (!isRecord(value) || typeof value.value !== 'string' || !value.value.trim()) return null;
	if (value.kind === 'text' || value.kind === 'lucide') return { kind: value.kind, value: value.value };
	if (value.kind !== 'svg') return null;
	// `tint` other than a boolean is dropped with the symbol, not guessed.
	if (value.tint === undefined) return { kind: 'svg', value: value.value };
	return typeof value.tint === 'boolean' ? { kind: 'svg', value: value.value, tint: value.tint } : null;
}

function folderColor(value: unknown): FolderColor | null {
	if (!isRecord(value) || typeof value.value !== 'string') return null;
	if (value.kind === 'preset') {
		const preset = PRESET_COLORS.find((name) => name === value.value);
		return preset ? { kind: 'preset', value: preset } : null;
	}
	if (value.kind !== 'hex') return null;
	const color: FolderColor = { kind: 'hex', value: value.value };
	return colorChannels(color) ? color : null;
}

function clamped(value: unknown, range: { min: number; max: number }): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	return Math.min(range.max, Math.max(range.min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
