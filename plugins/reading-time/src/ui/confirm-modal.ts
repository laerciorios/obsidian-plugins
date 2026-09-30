import { Modal, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { t } from '../i18n';

export interface ConfirmOptions {
	title: string;
	paragraphs: string[];
	confirm: string;
}

class ConfirmModal extends Modal {
	private confirmed = false;

	constructor(
		app: App,
		private readonly options: ConfirmOptions,
		private readonly done: (confirmed: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.options.title);
		for (const text of this.options.paragraphs) this.contentEl.createEl('p', { text });
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText(this.options.confirm)
					.setCta()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		this.done(this.confirmed);
	}
}

/** Resolves true when the user confirms, false when they cancel or close the modal. */
export function confirm(app: App, options: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => new ConfirmModal(app, options, resolve).open());
}
