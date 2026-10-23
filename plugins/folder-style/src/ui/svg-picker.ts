import { FuzzySuggestModal, Setting } from 'obsidian';
import type { App, FuzzyMatch, TFile } from 'obsidian';
import { CLS, SVG_MAX_BYTES } from '../constants';
import { t } from '../i18n';
import { svgFiles } from '../svg-files';
import type { VaultSvgs } from '../svg-files';
import { createSvgPreview, fileName, svgProblemText } from './svg-preview';

/** "SVG file" in the modal: the chosen file with its preview, a button to choose another, and "Use the folder color". */
export class SvgPicker {
	readonly el: HTMLElement;
	private readonly fileSetting: Setting;

	constructor(
		private readonly app: App,
		parent: HTMLElement,
		private readonly svgs: VaultSvgs,
		private path: string,
		private tint: boolean,
		private readonly onChange: (path: string, tint: boolean) => void,
	) {
		this.el = parent.createDiv({ cls: CLS.svgPicker });
		this.fileSetting = new Setting(this.el)
			.setName(t('modal.svg.name'))
			.addButton((button) => button.setButtonText(t('modal.svg.choose')).onClick(() => this.choose()));
		new Setting(this.el)
			.setName(t('modal.svg.tint.name'))
			.setDesc(t('modal.svg.tint.desc'))
			.addToggle((toggle) =>
				toggle.setValue(tint).onChange((value) => {
					this.tint = value;
					this.onChange(this.path, value);
					this.showSelection();
				}),
			);
		this.showSelection();
	}

	/** The selection may have been read later, or moved: show it again. */
	setPath(path: string): void {
		this.path = path;
		this.showSelection();
	}

	private choose(): void {
		new SvgSuggestModal(this.app, this.svgs, (file) => {
			this.path = file.path;
			// Read before reporting, so the live preview has the file.
			void this.svgs.load([file.path]).then(() => {
				this.onChange(this.path, this.tint);
				this.showSelection();
			});
		}).open();
	}

	private showSelection(): void {
		const desc = this.fileSetting.descEl;
		desc.empty();
		desc.createDiv({ text: t('modal.svg.desc', { size: SVG_MAX_BYTES / 1024 }) });
		const selected = desc.createDiv({ cls: CLS.iconSelected });
		if (!this.path) {
			selected.setText(t('modal.svg.noneSelected'));
			return;
		}
		const file = this.svgs.lookup(this.path);
		if (file && !file.ok) {
			selected.addClass(CLS.warning);
			selected.setText(svgProblemText(file.problem, this.path));
			return;
		}
		if (file) createSvgPreview(selected, file.svg, this.tint);
		selected.createSpan({ text: ` ${t('modal.icon.selected', { name: this.path })}` });
	}
}

/** Fuzzy search among the vault's SVG files, each with its preview. */
class SvgSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly svgs: VaultSvgs,
		private readonly onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(t('modal.svg.search'));
		this.emptyStateText = t('modal.svg.empty');
	}

	getItems(): TFile[] {
		return svgFiles(this.app.vault.getFiles());
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		const file = match.item;
		el.addClass(CLS.svgSuggestion);
		const preview = el.createDiv();
		const text = el.createDiv();
		text.createDiv({ text: fileName(file.path) });
		text.createDiv({ cls: CLS.svgSuggestionPath, text: file.path });
		void this.svgs.load([file.path]).then(() => {
			const svg = this.svgs.lookup(file.path);
			if (svg?.ok) createSvgPreview(preview, svg.svg, false);
		});
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
