import { ButtonComponent } from 'obsidian';
import { CLS, DIRECTORS_TIMEOUT_MS } from '../constants';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import { CatalogError } from '../providers/errors';
import { settleWithin } from '../providers/settle';
import type { SearchResult, Track } from '../types';
import { renderInstructions } from '../ui/instructions';
import { renderPreview } from '../ui/preview';
import { renderLoading } from '../ui/states';
import type { Chosen, Step, StepHost } from './steps';

/** What runs once the result is picked. At least one is true. */
export interface ResolveJobs {
	/** Provider.resolve: finish the result (the cover of MusicBrainz albums). */
	resolve: boolean;
	/** Provider.tracks: the tracklist of an album (create mode, setting on). */
	tracks: boolean;
	/** Provider.directors: the directors of a movie (create mode). */
	directors: boolean;
}

export interface ResolveOutcome {
	/** The result, completed by resolve() when it ran and did not fail. */
	result: SearchResult;
	/** The tracks (possibly []); undefined when not asked or when the request failed. */
	tracks?: Track[];
	/** The directors (possibly []); undefined when not asked, or when the request failed or took too long. */
	directors?: string[];
}

/** The result with `directors` as its authors, which the form fills `author` with. Unchanged when there are none. */
export function withDirectors(result: SearchResult, directors: readonly string[] | undefined): SearchResult {
	if (!directors || directors.length === 0) return result;
	return { ...result, details: { ...result.details, authors: [...directors] } };
}

function loadingKey(jobs: ResolveJobs): MessageKey {
	if (jobs.directors) return 'resolve.loadingDirectors';
	if (jobs.resolve && jobs.tracks) return 'resolve.loadingBoth';
	return jobs.tracks ? 'resolve.loadingTracks' : 'resolve.loading';
}

/**
 * Between the pick and the next step, for sources that finish a result once
 * it is picked (Provider.resolve: MusicBrainz checks the Cover Art Archive,
 * then iTunes), for album tracklists (Provider.tracks) and for the directors
 * of a movie (Provider.directors), all at the same time. Shows the chosen
 * item and a loading state; Back returns to the search. Leaving the step or
 * closing the modal drops the answers.
 */
export class ResolveStep implements Step {
	readonly title: string;
	private active = true;

	constructor(
		private readonly host: StepHost,
		private readonly chosen: Chosen,
		private readonly jobs: ResolveJobs,
		private readonly onDone: (outcome: ResolveOutcome) => void,
	) {
		this.title = t(host.options.mode === 'cover' ? 'modal.cover.title' : 'modal.confirm.title');
	}

	render(el: HTMLElement): void {
		const { result, provider } = this.chosen;
		// The thumbnail the result list already loaded: the full cover is what is being checked.
		renderPreview(el, result, provider.name, null, { cover: result.thumbUrl ?? result.coverUrl ?? null });
		renderLoading(el, t(loadingKey(this.jobs)));
		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		renderInstructions(el, [{ command: 'esc', purpose: t('modal.instructions.close') }]);
		void this.run();
	}

	destroy(): void {
		this.active = false;
	}

	private async run(): Promise<void> {
		const [result, tracks, directors] = await Promise.all([this.resolveResult(), this.fetchTracks(), this.fetchDirectors()]);
		if (this.active) this.onDone({ result, tracks, directors });
	}

	private async resolveResult(): Promise<SearchResult> {
		const { result, provider } = this.chosen;
		if (!this.jobs.resolve || !provider.resolve) return result;
		try {
			return await provider.resolve(result);
		} catch (error) {
			// resolve() should not throw: go on with the result as the search found it.
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not complete the result', error);
			return result;
		}
	}

	private async fetchTracks(): Promise<Track[] | undefined> {
		const { result, provider } = this.chosen;
		if (!this.jobs.tracks || !provider.tracks) return undefined;
		try {
			return await provider.tracks(result);
		} catch (error) {
			// The note is still created, without the section (a notice says so).
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not load the tracks', error);
			return undefined;
		}
	}

	private async fetchDirectors(): Promise<string[] | undefined> {
		const { result, provider } = this.chosen;
		if (!this.jobs.directors || !provider.directors) return undefined;
		const lookup = provider.directors(result).catch((error: unknown) => {
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not load the directors', error);
			throw error;
		});
		// A failed or slow request never holds the note back: the form opens with the field empty.
		return (await settleWithin(lookup, DIRECTORS_TIMEOUT_MS)) ?? undefined;
	}
}
