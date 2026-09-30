import { ButtonComponent, Notice } from 'obsidian';
import type { DropdownComponent } from 'obsidian';
import { renderTracklist, replaceTracklistSection } from '../catalog/tracklist';
import { CLS, IMPRESSIONS_HEADING } from '../constants';
import { t } from '../i18n';
import { CatalogError, describeError } from '../providers/errors';
import type { CatalogNoteInfo, Edition, Track } from '../types';
import { dropdownRow, infoRow } from '../ui/form';
import { modEnterLabel, renderInstructions } from '../ui/instructions';
import { renderPreview } from '../ui/preview';
import { renderEmpty, renderError, renderLoading } from '../ui/states';
import { editionLabel, renderTracklistPreview, summaryLabel } from '../ui/tracklist-view';
import { isSubmitKey } from './steps';
import type { Chosen, Step, StepHost } from './steps';

/** Editions and tracks of one album, kept by the modal: Back and a new pick of the same album do not reload them. */
export interface TracksState {
	key: string;
	/** Null until loaded, and for sources without editions. */
	editions: Edition[] | null;
	/** Index of the edition in use: the first (the representative one) until another is picked. */
	selected: number;
	/** Tracks already loaded, by edition id ("" is the source's default edition). */
	tracks: Map<string, Track[]>;
}

export function createTracksState(key: string): TracksState {
	return { key, editions: null, selected: 0, tracks: new Map() };
}

type Phase = { name: 'editions' } | { name: 'tracks' } | { name: 'ready' } | { name: 'error'; error: unknown; retry: () => void };

/** "Impressões", as the hint names the heading. */
const IMPRESSIONS_TEXT = IMPRESSIONS_HEADING.replace(/^#+\s*/, '');

/**
 * Last step of "Update album tracks": the edition (MusicBrainz: every
 * official release, the representative one first; iTunes: the collection),
 * the tracklist the note will get and "Update tracks", which replaces only
 * the tracklist section of the note (vault.process + replaceTracklistSection).
 * Changing the edition loads its tracks; answers for an edition no longer
 * selected are kept for later but never shown.
 */
export class TracksStep implements Step {
	readonly title = t('modal.tracks.title');
	private seq = 0;
	private active = true;
	private saving = false;
	private phase: Phase = { name: 'editions' };
	private editionEl: HTMLElement | null = null;
	private bodyEl: HTMLElement | null = null;
	private edition: DropdownComponent | null = null;
	private backButton: ButtonComponent | null = null;
	private submitButton: ButtonComponent | null = null;

	constructor(
		private readonly host: StepHost,
		private readonly note: CatalogNoteInfo,
		private readonly chosen: Chosen,
		private readonly state: TracksState,
	) {}

	render(el: HTMLElement): void {
		const { result, provider } = this.chosen;
		renderPreview(el, result, provider.name, null, { cover: result.thumbUrl ?? result.coverUrl ?? null });
		this.editionEl = el.createDiv({ cls: CLS.form });
		this.bodyEl = el.createDiv();
		el.createDiv({ cls: CLS.hint, text: t('tracks.hint', { heading: t('note.tracks.heading'), impressions: IMPRESSIONS_TEXT }) });

		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		this.backButton = new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		this.submitButton = new ButtonComponent(actions).setCta().onClick(() => void this.submit());
		renderInstructions(el, [
			{ command: modEnterLabel(), purpose: t('modal.instructions.submit') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);
		this.updateButton();
		void this.start();
	}

	/** The edition dropdown once loaded, else "Update tracks" when it can be pressed, else Back. */
	focus(): void {
		if (this.edition) this.edition.selectEl.focus();
		else if (this.canSubmit()) this.submitButton?.buttonEl.focus();
		else this.backButton?.buttonEl.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		if (!isSubmitKey(evt)) return false;
		void this.submit();
		return true;
	}

	destroy(): void {
		this.active = false;
		this.seq++;
	}

	private async start(): Promise<void> {
		if (this.chosen.provider.editions && this.state.editions === null) {
			await this.loadEditions();
			return;
		}
		this.renderEdition();
		await this.loadTracks();
	}

	private async loadEditions(): Promise<void> {
		const { result, provider } = this.chosen;
		const seq = ++this.seq;
		this.setPhase({ name: 'editions' });
		try {
			const editions = provider.editions ? await provider.editions(result) : [];
			if (seq !== this.seq) return;
			this.state.editions = editions;
			this.state.selected = 0;
		} catch (error) {
			if (seq !== this.seq) return;
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not load the editions', error);
			this.setPhase({ name: 'error', error, retry: () => void this.loadEditions() });
			return;
		}
		this.renderEdition();
		// The editions arrive after the step is on screen: the dropdown takes the focus.
		this.edition?.selectEl.focus();
		await this.loadTracks();
	}

	private currentEdition(): Edition | undefined {
		return this.state.editions?.[this.state.selected];
	}

	private currentTracks(): Track[] | null {
		return this.state.tracks.get(this.currentEdition()?.id ?? '') ?? null;
	}

	private async loadTracks(): Promise<void> {
		const { result, provider } = this.chosen;
		const edition = this.currentEdition();
		const id = edition?.id ?? '';
		const seq = ++this.seq;
		if (this.state.tracks.has(id)) {
			this.setPhase({ name: 'ready' });
			return;
		}
		this.setPhase({ name: 'tracks' });
		try {
			const tracks = provider.tracks ? await provider.tracks(result, edition) : [];
			// Kept even when another edition was picked meanwhile: it is the answer for this one.
			this.state.tracks.set(id, tracks);
			if (seq !== this.seq) return;
			this.setPhase({ name: 'ready' });
		} catch (error) {
			if (seq !== this.seq) return;
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not load the tracks', error);
			this.setPhase({ name: 'error', error, retry: () => void this.loadTracks() });
		}
	}

	private changeEdition(value: string): void {
		const index = Number(value);
		const editions = this.state.editions ?? [];
		if (!Number.isInteger(index) || index < 0 || index >= editions.length || index === this.state.selected) return;
		this.state.selected = index;
		void this.loadTracks();
	}

	/** A dropdown with several editions, the edition as text when there is one, nothing without editions. */
	private renderEdition(): void {
		const el = this.editionEl;
		if (!el) return;
		el.empty();
		this.edition = null;
		const editions = this.state.editions ?? [];
		const label = (edition: Edition): string => editionLabel(edition, this.chosen.result.title);
		const only = editions.length === 1 ? editions[0] : undefined;
		if (only) {
			infoRow(el, { name: t('tracks.edition') }, label(only));
		} else if (editions.length > 1) {
			this.edition = dropdownRow(el, {
				name: t('tracks.edition'),
				desc: t('tracks.editionDesc'),
				options: editions.map((edition, index) => [String(index), label(edition)] as const),
				value: String(this.state.selected),
				onChange: (value) => this.changeEdition(value),
			}).control;
		}
	}

	private setPhase(phase: Phase): void {
		if (!this.active) return;
		const first = phase.name === 'ready' && this.phase.name !== 'ready';
		this.phase = phase;
		this.paint();
		// Tracks on screen and no dropdown to go back to: "Update tracks" takes the focus.
		if (first && !this.edition && this.canSubmit()) this.submitButton?.buttonEl.focus();
	}

	private paint(): void {
		const body = this.bodyEl;
		if (body) {
			body.empty();
			const { phase } = this;
			if (phase.name === 'editions') renderLoading(body, t('tracks.loadingEditions'));
			else if (phase.name === 'tracks') renderLoading(body, t('tracks.loading'));
			else if (phase.name === 'error') renderError(body, describeError(phase.error, this.chosen.provider.name), phase.retry);
			else this.paintTracks(body);
		}
		this.updateButton();
	}

	private paintTracks(body: HTMLElement): void {
		const tracks = this.currentTracks() ?? [];
		if (tracks.length === 0) {
			renderEmpty(body, t('tracks.empty'));
			return;
		}
		body.createDiv({ cls: CLS.resultMeta, text: summaryLabel(tracks) });
		renderTracklistPreview(body, tracks);
	}

	private canSubmit(): boolean {
		return !this.saving && this.phase.name === 'ready' && (this.currentTracks()?.length ?? 0) > 0;
	}

	private updateButton(): void {
		this.submitButton?.setDisabled(!this.canSubmit()).setButtonText(t(this.saving ? 'confirm.saving' : 'tracks.update'));
	}

	private async submit(): Promise<void> {
		const tracks = this.currentTracks();
		if (!tracks || !this.canSubmit()) return;
		const { app } = this.host.context;
		const { file, title } = this.note;
		// Built before the write: the edition may not change while saving.
		const section = renderTracklist(tracks, t);
		this.saving = true;
		this.updateButton();
		try {
			await app.vault.process(file, (data) => replaceTracklistSection(data, section));
		} catch (error) {
			console.error('Media Catalog: could not update the tracks', error);
			new Notice(t('notice.tracksFailed', { name: title }));
			this.saving = false;
			this.updateButton();
			return;
		}
		new Notice(t('notice.tracksUpdated', { name: title }));
		if (this.active) this.host.close();
	}
}
