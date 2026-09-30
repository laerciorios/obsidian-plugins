import { Modal, Platform, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';
import type { ThreadStatus } from '../model/format';

export interface CommentModalOptions {
	quote: string;
	/** Status of the conversation the comment joins, or null for a new one. */
	existing: ThreadStatus | null;
	submit(body: string): void;
}

export function sendKeyLabel(): string {
	return Platform.isMacOS ? '⌘' : 'Ctrl';
}

/** The comment box: the quoted passage, a text area and Cancel / Comment. */
export class CommentModal extends Modal {
	private input: HTMLTextAreaElement | null = null;

	constructor(
		app: App,
		private readonly options: CommentModalOptions,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, options } = this;
		this.setTitle(t('modal.title'));
		if (options.quote) contentEl.createEl('blockquote', { cls: CLS.modalQuote, text: options.quote });
		else contentEl.createDiv({ cls: CLS.modalNote, text: t('modal.wholeBlock') });
		if (options.existing) {
			const key = options.existing === 'resolved' ? 'modal.existingResolved' : 'modal.existing';
			contentEl.createDiv({ cls: CLS.modalNote, text: t(key) });
		}
		this.input = contentEl.createEl('textarea', {
			cls: CLS.input,
			attr: { placeholder: t('modal.placeholder'), rows: '5', 'aria-label': t('modal.placeholder') },
		});
		contentEl.createDiv({ cls: CLS.hint, text: t('modal.hint', { key: sendKeyLabel() }) });
		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText(t('modal.submit'))
					.setCta()
					.onClick(() => this.send()),
			);
		this.scope.register(['Mod'], 'Enter', () => {
			this.send();
			return false;
		});
		this.input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private send(): void {
		const body = this.input?.value.trim() ?? '';
		if (!body) {
			this.input?.focus();
			return;
		}
		this.close();
		this.options.submit(body);
	}
}
