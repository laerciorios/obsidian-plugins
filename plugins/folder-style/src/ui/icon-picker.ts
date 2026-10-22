import { getIconIds, setIcon } from 'obsidian';
import { CLS, ICON_RESULTS_LIMIT } from '../constants';
import { t } from '../i18n';
import { searchIcons } from './icon-search';

/** Search field and grid of Lucide icons; the chosen one is highlighted and reported. */
export class IconPicker {
	readonly el: HTMLElement;
	private readonly selectedEl: HTMLElement;
	private readonly gridEl: HTMLElement;
	private readonly hintEl: HTMLElement;
	private readonly ids = getIconIds();
	private readonly buttons = new Map<string, HTMLButtonElement>();

	constructor(
		parent: HTMLElement,
		private selected: string,
		private readonly onChoose: (icon: string) => void,
	) {
		this.el = parent.createDiv({ cls: CLS.iconPicker });
		const search = this.el.createEl('input', { type: 'search', attr: { placeholder: t('modal.icon.search'), 'aria-label': t('modal.icon.search') } });
		search.addEventListener('input', () => this.showResults(search.value));
		this.selectedEl = this.el.createDiv({ cls: CLS.iconSelected });
		this.gridEl = this.el.createDiv({ cls: CLS.iconGrid });
		this.hintEl = this.el.createDiv({ cls: CLS.iconHint });
		this.showResults('');
		this.showSelection();
	}

	/** Rebuilt only when the query changes, so choosing an icon keeps the keyboard focus on it. */
	private showResults(query: string): void {
		const names = searchIcons(this.ids, query, ICON_RESULTS_LIMIT);
		this.gridEl.empty();
		this.buttons.clear();
		for (const name of names) {
			const button = this.gridEl.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': name } });
			setIcon(button, `lucide-${name}`);
			button.addEventListener('click', () => {
				this.selected = name;
				this.onChoose(name);
				this.showSelection();
			});
			this.buttons.set(name, button);
		}
		if (names.length === 0) this.hintEl.setText(t('modal.icon.empty'));
		else if (names.length === ICON_RESULTS_LIMIT) this.hintEl.setText(t('modal.icon.more', { count: ICON_RESULTS_LIMIT }));
		else this.hintEl.setText('');
		this.showSelection();
	}

	private showSelection(): void {
		const missing = this.selected !== '' && !this.ids.includes(`lucide-${this.selected}`);
		this.selectedEl.toggleClass(CLS.warning, missing);
		if (missing) this.selectedEl.setText(t('folder.missingIcon', { name: this.selected }));
		else this.selectedEl.setText(this.selected ? t('modal.icon.selected', { name: this.selected }) : t('modal.icon.noneSelected'));
		for (const [name, button] of this.buttons) {
			button.toggleClass('is-active', name === this.selected);
			button.setAttr('aria-pressed', String(name === this.selected));
		}
	}
}
