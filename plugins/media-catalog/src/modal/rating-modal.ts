import { ButtonComponent, Modal } from 'obsidian';
import type { App } from 'obsidian';
import { CLS, RATING_MAX, RATING_MIN } from '../constants';
import { t } from '../i18n';

export type RatingAnswer = { rating: number | null } | null;

/** Key that picks a rating: "1"…"9", and "0" for 10. */
function keyFor(rating: number): string {
	return String(rating % 10);
}

/**
 * "Mark as finished": one click (or one digit key) on 1–10 answers at once.
 * "Finish without rating" answers { rating: null }; Cancel and Esc answer null.
 */
class RatingModal extends Modal {
	private answered = false;
	private buttonsEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly itemTitle: string,
		private readonly resolve: (answer: RatingAnswer) => void,
	) {
		super(app);
		for (let rating = RATING_MIN; rating <= RATING_MAX; rating++) {
			this.scope.register([], keyFor(rating), () => {
				this.answer({ rating });
				return false;
			});
		}
	}

	onOpen(): void {
		this.modalEl.addClass(CLS.rating);
		this.setTitle(t('rating.title'));
		this.contentEl.createEl('p', { text: t('rating.desc', { title: this.itemTitle }) });

		// Focusable from code only (tabindex -1): Tab goes on to the buttons.
		const buttons = this.contentEl.createDiv({
			cls: CLS.ratingButtons,
			attr: { role: 'group', 'aria-label': t('rating.title'), tabindex: '-1' },
		});
		this.buttonsEl = buttons;
		for (let rating = RATING_MIN; rating <= RATING_MAX; rating++) {
			const button = new ButtonComponent(buttons).setButtonText(String(rating)).onClick(() => this.answer({ rating }));
			button.buttonEl.setAttr('aria-keyshortcuts', keyFor(rating));
		}

		const actions = this.contentEl.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('rating.cancel')).onClick(() => this.answer(null));
		new ButtonComponent(actions).setButtonText(t('rating.skip')).onClick(() => this.answer({ rating: null }));
	}

	open(): void {
		super.open();
		// Modal.open() focuses the first button ("1"), where Enter or Space would
		// rate at once. The group takes the focus instead; digit keys still answer.
		this.buttonsEl?.focus();
	}

	onClose(): void {
		this.contentEl.empty();
		this.settle(null);
	}

	private answer(value: RatingAnswer): void {
		this.settle(value);
		this.close();
	}

	/** Resolves exactly once, whatever comes first (a button, a key, Esc). */
	private settle(value: RatingAnswer): void {
		if (this.answered) return;
		this.answered = true;
		this.resolve(value);
	}
}

/** Resolves { rating } (null: finish without rating) or null when cancelled or closed. */
export function askRating(app: App, title: string): Promise<RatingAnswer> {
	return new Promise((resolve) => new RatingModal(app, title, resolve).open());
}
