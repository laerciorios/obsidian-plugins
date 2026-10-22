import { FuzzySuggestModal, Modal, Setting } from 'obsidian';
import type { App, ButtonComponent } from 'obsidian';
import { t } from '../../i18n';
import type { Preset } from './config';

/** Name a preset (new or renamed); for a new one, also whether to include the graph's filters. */
export class PresetNameModal extends Modal {
	private name: string;
	private includeNative: boolean;
	private saveButton: ButtonComponent | null = null;
	private hint: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly options: {
			title: string;
			name: string;
			/** Shown for new presets only. */
			includeNative?: boolean;
			/** Names already used (a match replaces that preset; shown as a hint). */
			taken: string[];
			save: (name: string, includeNative: boolean) => void;
		},
	) {
		super(app);
		this.name = options.name;
		this.includeNative = options.includeNative ?? false;
	}

	onOpen(): void {
		this.setTitle(this.options.title);
		const { contentEl } = this;
		const nameSetting = new Setting(contentEl).setName(t('presets.modal.name')).addText((text) => {
			text.setPlaceholder(t('presets.modal.placeholder')).setValue(this.name).onChange((value) => {
				this.name = value;
				this.refresh();
			});
			text.inputEl.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && this.name.trim() !== '') this.submit();
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		this.hint = nameSetting.descEl.createDiv();
		if (this.options.includeNative !== undefined) {
			new Setting(contentEl)
				.setName(t('presets.modal.native.name'))
				.setDesc(t('presets.modal.native.desc'))
				.addToggle((toggle) => toggle.setValue(this.includeNative).onChange((value) => (this.includeNative = value)));
		}
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.rule.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.saveButton = button;
				button
					.setButtonText(t('modal.rule.save'))
					.setCta()
					.onClick(() => this.submit());
			});
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private refresh(): void {
		const name = this.name.trim();
		this.saveButton?.setDisabled(name === '');
		const replaces = name !== '' && this.options.taken.some((taken) => taken.toLowerCase() === name.toLowerCase());
		this.hint?.setText(replaces ? t('presets.modal.replaces') : '');
	}

	private submit(): void {
		if (this.name.trim() === '') return;
		this.options.save(this.name.trim(), this.includeNative);
		this.close();
	}
}

/** "Apply preset…": pick one by name. */
export class PresetPicker extends FuzzySuggestModal<Preset> {
	constructor(
		app: App,
		private readonly presets: Preset[],
		private readonly picked: (preset: Preset) => void,
	) {
		super(app);
		this.setPlaceholder(t('presets.picker'));
	}

	getItems(): Preset[] {
		return this.presets;
	}

	getItemText(preset: Preset): string {
		return preset.name;
	}

	onChooseItem(preset: Preset): void {
		this.picked(preset);
	}
}
