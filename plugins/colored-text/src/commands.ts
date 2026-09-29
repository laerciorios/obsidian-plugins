import type { Plugin } from 'obsidian';
import type { ColorActions } from './actions';
import { t } from './i18n';
import type { PaletteColor } from './types';

/**
 * Command ids are stable API (hotkeys are saved by id): the fixed ones never
 * change, and the per-color ones follow the color's id, not its name.
 */
export class ColorCommands {
	private perColor: string[] = [];

	constructor(
		private readonly plugin: Plugin,
		private readonly actions: ColorActions,
	) {}

	register(): void {
		this.plugin.addCommand({
			id: 'color-selection',
			name: t('command.colorSelection'),
			icon: 'palette',
			editorCallback: (editor) => this.actions.applyLast(editor),
		});
		this.plugin.addCommand({
			id: 'choose-color',
			name: t('command.chooseColor'),
			icon: 'palette',
			editorCallback: (editor) => this.actions.choose(editor),
		});
		this.plugin.addCommand({
			id: 'remove-color',
			name: t('command.removeColor'),
			icon: 'eraser',
			editorCallback: (editor) => this.actions.remove(editor),
		});
	}

	/** One command per palette color, so each color can get its own hotkey. */
	sync(colors: readonly PaletteColor[]): void {
		for (const id of this.perColor) this.plugin.removeCommand(id);
		this.perColor = colors.map((color) => {
			const id = `apply-${color.id}`;
			this.plugin.addCommand({
				id,
				name: t('command.colorWith', { name: color.name }),
				icon: 'palette',
				editorCallback: (editor) => this.actions.applyColor(editor, color.id),
			});
			return id;
		});
	}
}
