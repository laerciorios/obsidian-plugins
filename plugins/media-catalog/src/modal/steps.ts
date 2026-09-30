import { Keymap } from 'obsidian';
import type { MessageKey } from '../i18n';
import type { CatalogContext, CatalogNoteInfo, Provider, SearchResult, SeasonInfo, Track } from '../types';

/**
 * create: a new note. cover: "Change cover" of `note`. tracks: "Update album
 * tracks" of `note` (an album). The last two search the note and lock its kind.
 */
export type CatalogModalOptions =
	| { mode: 'create' }
	| { mode: 'cover'; note: CatalogNoteInfo }
	| { mode: 'tracks'; note: CatalogNoteInfo };

/** The note a cover or tracks modal works on; null when creating. */
export function noteOf(options: CatalogModalOptions): CatalogNoteInfo | null {
	return options.mode === 'create' ? null : options.note;
}

/** Title of the modal before the last step (search, loading). */
export const MODE_TITLES: Record<CatalogModalOptions['mode'], MessageKey> = {
	create: 'modal.add.title',
	cover: 'modal.cover.title',
	tracks: 'modal.tracks.title',
};

/** One screen of the catalog modal. The modal owns the state that survives going back. */
export interface Step {
	/** Modal title while the step is on screen. */
	readonly title: string;
	render(el: HTMLElement): void;
	/**
	 * Put the focus where the step starts (search input, season grid, title…).
	 * Called after render and again after Modal.open(), which focuses the first
	 * focusable element of the modal on its own.
	 */
	focus?(): void;
	/**
	 * Arrows, Enter and Mod+Enter from the modal scope. True: handled (the
	 * default action is prevented); false: the key keeps its normal behavior.
	 */
	onKey?(evt: KeyboardEvent): boolean;
	/** The step leaves the screen or the modal closes: cancel timers, drop pending requests. */
	destroy?(): void;
}

/** The item picked in the search step, with the provider that found it. */
export interface Chosen {
	result: SearchResult;
	provider: Provider;
	/**
	 * Albums in create mode with the tracklist setting on: the tracks fetched
	 * after the pick, null when unavailable. Undefined otherwise.
	 */
	tracks?: Track[] | null;
}

/** Cache key of a picked result: `<provider>:<externalId>`. */
export function resultKey(result: SearchResult, provider: Provider): string {
	return `${provider.id}:${result.externalId}`;
}

/** What a step may ask of the modal. */
export interface StepHost {
	readonly context: CatalogContext;
	readonly options: CatalogModalOptions;
	chooseResult(result: SearchResult, provider: Provider): void;
	chooseSeason(season: SeasonInfo): void;
	back(): void;
	close(): void;
}

const CONTROL_TAGS: ReadonlySet<string> = new Set(['A', 'BUTTON', 'SELECT', 'TEXTAREA']);

/** The key went to a button, dropdown or link, which handle arrows and Enter themselves. */
export function isOnControl(evt: KeyboardEvent): boolean {
	const node = evt.targetNode;
	return node !== null && node.instanceOf(HTMLElement) && CONTROL_TAGS.has(node.tagName);
}

/** Mod+Enter: submit on the confirm steps. */
export function isSubmitKey(evt: KeyboardEvent): boolean {
	return evt.key === 'Enter' && Keymap.isModifier(evt, 'Mod');
}
