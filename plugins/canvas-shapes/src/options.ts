import { LINE_STYLES, LINE_WIDTHS, SHAPES } from '@obsidian-plugins/json-canvas-render';
import type { LineStyle, Shape } from '@obsidian-plugins/json-canvas-render';

/** The choices offered by the toolbar, menus and commands, with their stable ids. */

export const SHAPE_OPTIONS: readonly Shape[] = SHAPES;
export const LINE_OPTIONS: readonly LineStyle[] = LINE_STYLES;

export type WidthName = 'thin' | 'normal' | 'bold' | 'extra-bold';

export const WIDTH_OPTIONS: readonly { name: WidthName; width: (typeof LINE_WIDTHS)[number] }[] = [
	{ name: 'thin', width: 1 },
	{ name: 'normal', width: 2 },
	{ name: 'bold', width: 4 },
	{ name: 'extra-bold', width: 8 },
];
