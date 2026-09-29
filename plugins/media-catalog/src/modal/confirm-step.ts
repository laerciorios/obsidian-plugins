import { ButtonComponent, Notice, debounce } from 'obsidian';
import type { TFile } from 'obsidian';
import { findDuplicate } from '../catalog/duplicates';
import { createCatalogNote } from '../catalog/note-writer';
import type { CreateResult } from '../catalog/note-writer';
import { CLS, SEARCH_DEBOUNCE_MS } from '../constants';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { renderChosenPreview } from './chosen-preview';
import { ConfirmForm } from './confirm-fields';
import type { ConfirmInput } from './confirm-values';
import { isSubmitKey } from './steps';
import type { Step, StepHost } from './steps';

/** Create mode: large cover, duplicate banner, the form, and "Create note". */
export class ConfirmStep implements Step {
	readonly title = t('modal.confirm.title');
	private readonly form: ConfirmForm;
	private duplicateEl: HTMLElement | null = null;
	private submitButton: ButtonComponent | null = null;
	private duplicate: TFile | null = null;
	private saving = false;
	private active = true;
	private readonly recheck = debounce(() => this.checkDuplicate(), SEARCH_DEBOUNCE_MS, true);

	constructor(
		private readonly host: StepHost,
		private readonly input: ConfirmInput,
	) {
		const { app, settings } = host.context;
		this.form = new ConfirmForm(app, settings, input, () => this.recheck());
	}

	render(el: HTMLElement): void {
		renderChosenPreview(el, this.input, { onCover: (url) => this.form.setCover(url) });
		this.duplicateEl = el.createDiv({ cls: CLS.duplicate, attr: { role: 'alert' } });
		this.form.render(el.createDiv({ cls: CLS.form }));

		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		this.submitButton = new ButtonComponent(actions)
			.setButtonText(t('confirm.create'))
			.setCta()
			.onClick(() => void this.submit());
		renderInstructions(el, [
			{ command: modEnterLabel(), purpose: t('modal.instructions.submit') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);

		this.checkDuplicate();
	}

	focus(): void {
		this.form.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		if (!isSubmitKey(evt)) return false;
		void this.submit();
		return true;
	}

	destroy(): void {
		this.active = false;
		this.recheck.cancel();
	}

	private checkDuplicate(): void {
		if (!this.active) return;
		const { app, settings } = this.host.context;
		const title = this.form.title;
		const season = this.input.season?.number ?? null;
		const query = { kind: this.input.result.kind, title, season, year: this.form.year };
		this.showDuplicate(title ? findDuplicate(app, settings.folder, query) : null);
	}

	private showDuplicate(file: TFile | null): void {
		this.duplicate = file;
		const el = this.duplicateEl;
		if (el) {
			el.empty();
			el.toggle(file !== null);
			if (file) {
				el.createSpan({ text: t('confirm.duplicate', { name: file.basename }) });
				new ButtonComponent(el).setButtonText(t('confirm.open')).onClick(() => this.open(file));
			}
		}
		this.updateButton();
	}

	private open(file: TFile): void {
		this.host.close();
		void this.host.context.app.workspace.getLeaf(false).openFile(file);
	}

	private updateButton(): void {
		this.submitButton
			?.setDisabled(this.saving || this.duplicate !== null)
			.setButtonText(t(this.saving ? 'confirm.saving' : 'confirm.create'));
	}

	private async submit(): Promise<void> {
		if (this.saving || this.duplicate) return;
		const draft = this.form.draft();
		if (!draft) return;
		const { app, settings } = this.host.context;

		this.saving = true;
		this.updateButton();
		let result: CreateResult;
		try {
			result = await createCatalogNote(app, settings, draft);
		} catch (error) {
			// Expected failures (the folder setting points to a file) come with their own notice.
			if (!(error instanceof CatalogError)) {
				console.error('Media Catalog: could not create the note', error);
				new Notice(t('notice.createFailed'));
			}
			return;
		} finally {
			this.saving = false;
			this.updateButton();
		}

		if (result.status === 'duplicate') {
			// Created meanwhile (another window, a sync): show it instead of a second note.
			if (this.active) this.showDuplicate(result.file);
			else new Notice(t('notice.duplicate', { name: result.file.basename }));
			return;
		}
		new Notice(t('notice.created', { name: result.file.basename }));
		// Closed while saving (Esc): the note exists, but do not pull the user into it.
		if (!this.active) return;
		this.host.close();
		void app.workspace.getLeaf(false).openFile(result.file);
	}
}
