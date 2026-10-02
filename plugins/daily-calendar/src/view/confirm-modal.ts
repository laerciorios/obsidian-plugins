import { Modal, moment } from 'obsidian';
import type { App } from 'obsidian';
import { capitalize } from '../calendar/grid';
import { t } from '../i18n';

/** "Create the daily note of <day>?" Closing the window counts as no. */
class CreateDailyModal extends Modal {
	private answered = false;

	constructor(
		app: App,
		private readonly date: moment.Moment,
		private readonly path: string,
		private readonly resolve: (create: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('confirm.title'));
		const day = capitalize(this.date.format('dddd, LL'), moment.locale());
		this.contentEl.createEl('p', { text: t('confirm.body', { date: day, path: this.path }) });
		// Like Obsidian's own confirmations: the action first, focused, then Cancel.
		const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
		const create = buttons.createEl('button', { cls: 'mod-cta', text: t('confirm.create') });
		create.addEventListener('click', () => this.answer(true));
		buttons.createEl('button', { text: t('confirm.cancel') }).addEventListener('click', () => this.answer(false));
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			this.answer(true);
		});
		// Obsidian moves the focus into the modal after onOpen.
		window.setTimeout(() => create.focus(), 0);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.answered) this.resolve(false);
	}

	private answer(create: boolean): void {
		this.answered = true;
		this.resolve(create);
		this.close();
	}
}

/** Ask before creating the daily note of a day; resolves to the answer. */
export function confirmCreate(app: App, date: moment.Moment, path: string): Promise<boolean> {
	return new Promise((resolve) => new CreateDailyModal(app, date, path, resolve).open());
}
