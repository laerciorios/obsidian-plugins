/** How a palette color is drawn: as the text color or as the highlight background. */
export type ColorStyle = 'text' | 'background';

export interface PaletteColor {
	/** Stable id, part of the command id. Never shown and never written to notes. */
	id: string;
	/** Written in notes as =={name}text==. */
	name: string;
	/** Lowercase "#rrggbb". */
	color: string;
	style: ColorStyle;
}

export interface ColoredTextSettings {
	version: 1;
	colors: PaletteColor[];
	/** Last color applied: a palette id, or a "#hex" typed in the picker. */
	lastColor: string;
	/** Add the color actions to the editor context menu. */
	editorMenu: boolean;
}

/** What a marker resolves to. */
export interface ResolvedColor {
	color: string;
	style: ColorStyle;
}
