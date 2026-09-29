import { Notice } from 'obsidian';
import type { App, Editor } from 'obsidian';
import { colorSelection, hasColor, uncolorSelection } from './editor/edit';
import { t } from './i18n';
import type { Palette } from './palette';
import type { ColoredTextSettings } from './types';
import { ColorModal } from './ui/color-modal';

export interface ActionsHost {
	app: App;
	settings: ColoredTextSettings;
	palette: Palette;
	rememberColor(token: string): void;
}

/** What commands, the picker and the context menu do, in one place. */
export class ColorActions {
	constructor(private readonly host: ActionsHost) {}

	/** Marker of the last color used, falling back to the first palette color. */
	lastToken(): string | null {
		const { palette, settings } = this.host;
		return palette.tokenFor(settings.lastColor) ?? palette.colors[0]?.name ?? null;
	}

	apply(editor: Editor, token: string): void {
		if (!colorSelection(editor, token, this.host.palette.isMarker)) {
			new Notice(t('notice.nothingToColor'));
			return;
		}
		this.host.rememberColor(token);
	}

	applyLast(editor: Editor): void {
		const token = this.lastToken();
		if (token) this.apply(editor, token);
		else this.choose(editor);
	}

	applyColor(editor: Editor, colorId: string): void {
		const color = this.host.palette.colors.find((candidate) => candidate.id === colorId);
		if (color) this.apply(editor, color.name);
	}

	choose(editor: Editor): void {
		new ColorModal(this.host.app, this.host.palette, (token) => this.apply(editor, token)).open();
	}

	remove(editor: Editor): void {
		if (!uncolorSelection(editor, this.host.palette.isMarker)) new Notice(t('notice.nothingToRemove'));
	}

	canRemove(editor: Editor): boolean {
		return hasColor(editor, this.host.palette.isMarker);
	}
}
