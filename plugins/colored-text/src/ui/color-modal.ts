import { SuggestModal } from 'obsidian';
import type { App } from 'obsidian';
import { CLS, COLOR_VAR, NUMBER_KEYS } from '../constants';
import { t } from '../i18n';
import { nameKey } from '../palette';
import type { Palette } from '../palette';
import { normalizeHex } from '../syntax';
import type { ColorStyle, PaletteColor } from '../types';

type Choice = { kind: 'palette'; color: PaletteColor; key: string | null } | { kind: 'hex'; hex: string };

/**
 * The color picker: palette colors numbered 1–9 and 0 (pressed with an empty
 * query, they apply at once), filtered by name as you type. A query starting
 * with "#" offers that hex code too.
 */
export class ColorModal extends SuggestModal<Choice> {
	constructor(
		app: App,
		private readonly palette: Palette,
		private readonly onPick: (token: string) => void,
	) {
		super(app);
		this.limit = 100;
		this.setPlaceholder(t('modal.placeholder'));
		this.emptyStateText = t('modal.empty');
		this.setInstructions([
			{ command: '1–9, 0', purpose: t('modal.number') },
			{ command: '↑↓', purpose: t('modal.navigate') },
			{ command: '↵', purpose: t('modal.apply') },
			{ command: 'esc', purpose: t('modal.dismiss') },
		]);
		NUMBER_KEYS.forEach((key, index) => {
			this.scope.register([], key, () => {
				const color = this.palette.colors[index];
				// With a query, digits are typed as usual.
				if (this.inputEl.value !== '' || !color) return true;
				this.close();
				this.onPick(color.name);
				return false;
			});
		});
	}

	getSuggestions(query: string): Choice[] {
		const wanted = nameKey(query);
		const hex = wanted.startsWith('#') ? normalizeHex(wanted) : null;
		const choices: Choice[] = [];
		this.palette.colors.forEach((color, index) => {
			const byName = nameKey(color.name).includes(wanted);
			const byHex = wanted.startsWith('#') && color.color.startsWith(wanted);
			if (!wanted || byName || byHex) choices.push({ kind: 'palette', color, key: NUMBER_KEYS[index] ?? null });
		});
		if (hex && !choices.some((choice) => choice.kind === 'palette' && choice.color.color === hex)) {
			choices.unshift({ kind: 'hex', hex });
		}
		return choices;
	}

	renderSuggestion(choice: Choice, el: HTMLElement): void {
		const color = choice.kind === 'hex' ? choice.hex : choice.color.color;
		const style: ColorStyle = choice.kind === 'hex' ? 'text' : choice.color.style;
		el.addClass(CLS.suggestion);
		el.createSpan({ cls: CLS.number, text: choice.kind === 'palette' ? (choice.key ?? '') : '' });
		const swatch = el.createSpan({ cls: CLS.swatch });
		swatch.setCssProps({ [COLOR_VAR]: color });
		const label = choice.kind === 'hex' ? t('modal.hex', { hex: choice.hex }) : choice.color.name;
		const preview = el.createSpan({ cls: [CLS.preview, CLS.style(style)], text: label });
		preview.setCssProps({ [COLOR_VAR]: color });
		el.createSpan({ cls: CLS.hex, text: color });
	}

	onChooseSuggestion(choice: Choice): void {
		this.onPick(choice.kind === 'hex' ? choice.hex : choice.color.name);
	}
}
