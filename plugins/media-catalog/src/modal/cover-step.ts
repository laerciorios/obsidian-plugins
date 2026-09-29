import { ButtonComponent, Notice } from 'obsidian';
import type { DropdownComponent } from 'obsidian';
import { downloadCover } from '../catalog/cover-download';
import { setCover } from '../catalog/updates';
import { CLS } from '../constants';
import { t } from '../i18n';
import type { CatalogNoteInfo } from '../types';
import { coverChoiceRow, noCoverRow } from '../ui/cover-row';
import { renderCurrentCover } from '../ui/current-cover';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { renderChosenPreview } from './chosen-preview';
import { coverUrlOf } from './confirm-values';
import type { ConfirmInput } from './confirm-values';
import { isSubmitKey } from './steps';
import type { Step, StepHost } from './steps';

/**
 * Cover mode: the note's current cover next to the chosen one, "Keep the
 * link" / "Download" and "Update cover".
 */
export class CoverStep implements Step {
	readonly title = t('modal.cover.title');
	private download: boolean;
	/** The new cover: the result's, or the poster picked for a series. */
	private url: string | null;
	private saving = false;
	private active = true;
	private sameEl: HTMLElement | null = null;
	private choice: DropdownComponent | null = null;
	private backButton: ButtonComponent | null = null;
	private submitButton: ButtonComponent | null = null;

	constructor(
		private readonly host: StepHost,
		private readonly note: CatalogNoteInfo,
		private readonly input: ConfirmInput,
	) {
		this.download = host.context.settings.downloadCovers;
		this.url = coverUrlOf(input);
	}

	render(el: HTMLElement): void {
		const { app } = this.host.context;
		renderChosenPreview(el, this.input, {
			current: (slot) => renderCurrentCover(slot, app, this.note),
			onCover: (url) => {
				this.url = url;
				this.updateButton();
			},
		});
		this.sameEl = el.createDiv({ cls: CLS.hint, text: t('cover.same') });
		const form = el.createDiv({ cls: CLS.form });
		if (this.url) {
			this.choice = coverChoiceRow(form, this.download, (download) => {
				this.download = download;
				this.updateButton();
			}).control;
		} else {
			noCoverRow(form);
		}

		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		this.backButton = new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		this.submitButton = new ButtonComponent(actions).setCta().onClick(() => void this.submit());
		renderInstructions(el, [
			{ command: modEnterLabel(), purpose: t('modal.instructions.submit') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);
		this.updateButton();
	}

	/** "Update cover" when it can be pressed, else the cover choice, else Back. */
	focus(): void {
		if (this.canSubmit()) this.submitButton?.buttonEl.focus();
		else if (this.choice) this.choice.selectEl.focus();
		else this.backButton?.buttonEl.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		if (!isSubmitKey(evt)) return false;
		void this.submit();
		return true;
	}

	destroy(): void {
		this.active = false;
	}

	/** Keeping the link the note already has: nothing would change. A download always makes a new file. */
	private isUnchanged(): boolean {
		return !this.download && this.url !== null && this.url === this.note.cover;
	}

	private canSubmit(): boolean {
		return this.url !== null && !this.saving && !this.isUnchanged();
	}

	private updateButton(): void {
		this.sameEl?.toggle(this.isUnchanged());
		this.submitButton
			?.setDisabled(!this.canSubmit())
			.setButtonText(t(this.saving ? 'confirm.saving' : 'confirm.updateCover'));
	}

	private async submit(): Promise<void> {
		const url = this.url;
		if (!url || !this.canSubmit()) return;
		const { app } = this.host.context;
		const { file, title } = this.note;
		this.setSaving(true);

		let value = url;
		if (this.download) {
			try {
				value = await downloadCover(app, url, file.basename, file.path);
			} catch (error) {
				console.error('Media Catalog: could not download the cover', error);
				new Notice(t('notice.downloadFailed'));
			}
		}
		try {
			await setCover(app, file, value);
		} catch (error) {
			console.error('Media Catalog: could not update the cover', error);
			new Notice(t('notice.coverFailed', { name: title }));
			this.setSaving(false);
			return;
		}
		new Notice(t('notice.coverUpdated', { name: title }));
		if (this.active) this.host.close();
	}

	private setSaving(saving: boolean): void {
		this.saving = saving;
		this.updateButton();
	}
}
