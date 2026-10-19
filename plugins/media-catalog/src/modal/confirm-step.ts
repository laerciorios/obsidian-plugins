import { ButtonComponent, Notice, debounce } from 'obsidian';
import type { TFile } from 'obsidian';
import { findInCatalogOrBacklog } from '../catalog/duplicates';
import { isInFolder } from '../catalog/backlog';
import { createCatalogNote } from '../catalog/note-writer';
import type { CreateResult } from '../catalog/note-writer';
import { CLS, SEARCH_DEBOUNCE_MS } from '../constants';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import { findLocalizedTitle } from '../providers/localized-title';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { renderChosenPreview } from './chosen-preview';
import { ConfirmForm } from './confirm-fields';
import { tracklistOf } from './confirm-values';
import type { ConfirmInput } from './confirm-values';
import { newRun } from './new-run';
import { startBacklogItem } from './start-item';
import { isSubmitKey } from './steps';
import type { Step, StepHost } from './steps';

/**
 * Create mode: large cover, duplicate banner, the form, and "Create note".
 * The alternative title (alias country) is looked up as soon as the step
 * opens, out of sight, and awaited by "Create note". The banner of a note
 * already in the catalog offers a new run in it ("Register again") instead
 * of a second note; one in the backlog offers to start it.
 */
export class ConfirmStep implements Step {
	readonly title = t('modal.confirm.title');
	private readonly form: ConfirmForm;
	private duplicateEl: HTMLElement | null = null;
	private submitButton: ButtonComponent | null = null;
	private duplicate: TFile | null = null;
	private saving = false;
	private active = true;
	private readonly recheck = debounce(() => this.checkDuplicate(), SEARCH_DEBOUNCE_MS, true);
	/** Never rejects: null without a country, an answer, or one in time. */
	private readonly localizedTitle: Promise<string | null>;

	constructor(
		private readonly host: StepHost,
		private readonly input: ConfirmInput,
	) {
		const { app, settings } = host.context;
		this.form = new ConfirmForm(app, settings, input, () => this.recheck());
		this.localizedTitle = findLocalizedTitle(input.provider, input.result, settings.aliasCountry);
	}

	render(el: HTMLElement): void {
		renderChosenPreview(el, this.input, {
			onCover: (url) => this.form.setCover(url),
			tracks: tracklistOf(this.input, this.host.context.settings),
		});
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
		const query = { kind: this.input.result.kind, title, season, year: this.form.year, author: this.form.author };
		this.showDuplicate(title ? findInCatalogOrBacklog(app, settings, query) : null);
	}

	private showDuplicate(file: TFile | null): void {
		this.duplicate = file;
		const el = this.duplicateEl;
		if (el) {
			el.empty();
			el.toggle(file !== null);
			if (file) {
				const backlog = isInFolder(file.path, this.host.context.settings.backlogFolder);
				el.createSpan({ text: t(backlog ? 'confirm.duplicateBacklog' : 'confirm.duplicate', { name: file.basename }) });
				const actions = el.createDiv({ cls: CLS.duplicateActions });
				if (backlog) new ButtonComponent(actions).setButtonText(t('confirm.start')).onClick(() => void this.start(file));
				else new ButtonComponent(actions).setButtonText(t('confirm.registerAgain')).onClick(() => void this.registerAgain(file));
				new ButtonComponent(actions).setButtonText(t('confirm.open')).onClick(() => this.open(file));
			}
		}
		this.updateButton();
	}

	/**
	 * The "New run" of the existing note, over this modal, with the platform
	 * (and start date) of the form. Once written, the note opens; cancelled,
	 * the form is still here.
	 */
	private async registerAgain(file: TFile): Promise<void> {
		const written = await newRun(this.host.context, file, { platform: this.form.platform, started: this.form.started });
		if (written) this.open(file);
	}

	/** "Start backlog item" on the note in the backlog; once moved, the note opens. */
	private async start(file: TFile): Promise<void> {
		this.host.close();
		if (await startBacklogItem(this.host.context, file)) void this.host.context.app.workspace.getLeaf(false).openFile(file);
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
			// The note gets the title alone when the alternative title is not there in time.
			const localizedTitle = await this.localizedTitle;
			result = await createCatalogNote(app, settings, { ...draft, localizedTitle });
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
		const backlog = draft.destination === 'backlog';
		new Notice(t(backlog ? 'notice.createdBacklog' : 'notice.created', { name: result.file.basename }));
		// Album without its tracklist (fetch failed, none listed, a source without tracks): the note has no section.
		if (!backlog && draft.kind === 'album' && settings.albumTracklist && !draft.tracks) new Notice(t('notice.tracksMissing'));
		// Closed while saving (Esc): the note exists, but do not pull the user into it.
		if (!this.active) return;
		this.host.close();
		void app.workspace.getLeaf(false).openFile(result.file);
	}
}
