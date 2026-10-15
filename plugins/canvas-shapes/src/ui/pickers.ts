import { FuzzySuggestModal, Modal, Setting } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { t } from '../i18n';
import { MEDIA_EXTENSIONS, normalizeUrl } from '../tools/tools';

/** Pick a file of the vault: notes for the note tool, images/audio/video/PDF for the media tool. */
export class FilePicker extends FuzzySuggestModal<TFile> {
	private chosen = false;

	constructor(
		app: App,
		private readonly files: TFile[],
		placeholder: string,
		private readonly choose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
		this.emptyStateText = t('picker.empty');
	}

	getItems(): TFile[] {
		return this.files;
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		if (this.chosen) return;
		this.chosen = true;
		this.choose(file);
	}
}

export function noteFiles(app: App): TFile[] {
	return app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime);
}

export function mediaFiles(app: App): TFile[] {
	return app.vault
		.getFiles()
		.filter((file) => MEDIA_EXTENSIONS.has(file.extension.toLowerCase()))
		.sort((a, b) => b.stat.mtime - a.stat.mtime);
}

/** Ask for a web address (https:// is added when missing). */
export class UrlPrompt extends Modal {
	private value = '';

	constructor(
		app: App,
		private readonly choose: (url: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('picker.web.title'));
		let error: HTMLElement | null = null;
		const submit = (): void => {
			const url = normalizeUrl(this.value);
			if (!url) {
				error?.setText(t('picker.web.invalid'));
				return;
			}
			this.close();
			this.choose(url);
		};
		new Setting(this.contentEl).setName(t('picker.web.name')).addText((text) => {
			text.setPlaceholder('https://example.com').onChange((value) => (this.value = value));
			text.inputEl.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' && !event.isComposing) {
					event.preventDefault();
					submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		error = this.contentEl.createDiv({ cls: 'cs-picker-error' });
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText(t('export.cancel')).onClick(() => this.close()))
			.addButton((button) => button.setButtonText(t('picker.web.confirm')).setCta().onClick(submit));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
