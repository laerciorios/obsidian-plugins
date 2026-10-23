import type { PRESET_COLORS } from './constants';

export type PresetColor = (typeof PRESET_COLORS)[number];

/**
 * Text is any short string (emoji, character); lucide is an icon id without the `lucide-` prefix;
 * svg is the full vault path of an SVG file, drawn in its own colors or, with `tint`, as a mask
 * in the folder or theme color like a Lucide icon.
 */
export type FolderSymbol = { kind: 'text'; value: string } | { kind: 'lucide'; value: string } | { kind: 'svg'; value: string; tint?: boolean };

/** Presets follow the theme (`--color-<name>-rgb`); hex is `#rgb` or `#rrggbb`. */
export type FolderColor = { kind: 'preset'; value: PresetColor } | { kind: 'hex'; value: string };

/** `symbol` and `color` are independent: a folder may have either or both. */
export interface FolderStyle {
	symbol?: FolderSymbol;
	color?: FolderColor;
}

/** Folder styles keyed by the folder's full vault path. */
export type FolderStyles = Record<string, FolderStyle>;

/** SVG markup of a Lucide icon bundled with Obsidian, or null when Obsidian does not have it. */
export type IconLookup = (id: string) => string | null;

/** Why a vault SVG cannot be drawn: no such file, an empty one, or one over `SVG_MAX_BYTES`. */
export type SvgProblem = 'missing' | 'empty' | 'too-large';

/** A vault SVG file as read: its markup or why it cannot be drawn. */
export type SvgFile = { ok: true; svg: string } | { ok: false; problem: SvgProblem };

/** A vault SVG file by path; undefined while it has not been read yet (nothing is drawn or flagged). */
export type SvgLookup = (path: string) => SvgFile | undefined;

export interface FolderStyleSettings {
	version: 1;
	/** Alpha of the folder row tint, 0..1. */
	opacity: number;
	/** Tint the folder's children with half the opacity. */
	tintChildren: boolean;
	/** Symbol size as a factor of the folder name's font size. */
	symbolSize: number;
	folders: FolderStyles;
}
