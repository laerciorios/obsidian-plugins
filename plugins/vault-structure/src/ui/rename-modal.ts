import { Modal, Setting } from 'obsidian';
import type { App, ButtonComponent, TFolder } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';
import { nameError } from './name-field';

/** A new name for a folder, starting from the suggestion. Resolves null when cancelled. */
export class RenameFolderModal extends Modal {
	private name: string;
	private errorEl: HTMLElement | null = null;
	private okButton: ButtonComponent | null = null;
	private resolve: (name: string | null) => void = () => {};
	private result: string | null = null;

	constructor(
		app: App,
		private readonly folder: TFolder,
		suggestion: string,
	) {
		super(app);
		this.name = suggestion;
	}

	choose(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl, folder } = this;
		this.setTitle(t('rename.title'));
		contentEl.createEl('p', { cls: CLS.muted, text: t('rename.desc', { path: folder.path }) });
		new Setting(contentEl).setName(folder.name).addText((text) => {
			text.setValue(this.name).onChange((value) => {
				this.name = value;
				this.refresh();
			});
			text.inputEl.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && !event.isComposing) {
					event.preventDefault();
					this.submit();
				}
			});
			window.setTimeout(() => text.inputEl.select(), 0);
		});
		this.errorEl = contentEl.createDiv({ cls: [CLS.hint, CLS.warning] });
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.okButton = button;
				button
					.setButtonText(t('rename.ok'))
					.setCta()
					.onClick(() => this.submit());
			});
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolve(this.result);
	}

	/** Same checks as a new folder; renaming to the same name is not a rename. */
	private error(): string | null {
		if (this.name.trim() === this.folder.name) return null;
		return nameError(this.name, this.folder.parent, this.folder);
	}

	private refresh(): void {
		const error = this.error();
		this.errorEl?.setText(error ?? '');
		this.okButton?.setDisabled(error !== null || this.name.trim() === this.folder.name);
	}

	private submit(): void {
		if (this.error() || this.name.trim() === this.folder.name) return;
		this.result = this.name.trim();
		this.close();
	}
}
