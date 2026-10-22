import type { PRESET_COLORS } from './constants';

export type PresetColor = (typeof PRESET_COLORS)[number];

/** Text is any short string (emoji, character); lucide is an icon id without the `lucide-` prefix. */
export type FolderSymbol = { kind: 'text'; value: string } | { kind: 'lucide'; value: string };

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
