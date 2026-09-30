import { Modal, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { CLS, MAX_LISTED } from '../constants';
import { t } from '../i18n';

export interface ListItem {
	from: string;
	to: string;
}

export interface ConfirmOptions {
	title: string;
	message: string;
	items: ListItem[];
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
		const { contentEl, options } = this;
		this.setTitle(options.title);
		contentEl.createEl('p', { text: options.message });
		const list = contentEl.createEl('ul', { cls: CLS.list });
		for (const item of options.items.slice(0, MAX_LISTED)) {
			const row = list.createEl('li', { cls: CLS.listItem });
			row.createSpan({ cls: CLS.muted, text: item.from });
			row.createSpan({ cls: CLS.arrow, text: '→' });
			row.createSpan({ text: item.to });
		}
		const more = options.items.length - MAX_LISTED;
		if (more > 0) contentEl.createEl('p', { cls: CLS.muted, text: t('modal.more', { count: more }) });
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText(options.confirm)
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
export function confirmChanges(app: App, options: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => new ConfirmModal(app, options, resolve).open());
}
