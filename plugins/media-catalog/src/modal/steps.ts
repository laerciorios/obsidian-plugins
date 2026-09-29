import { Keymap } from 'obsidian';
import type { CatalogContext, CatalogNoteInfo, Provider, SearchResult, SeasonInfo } from '../types';

export type CatalogModalOptions = { mode: 'create' } | { mode: 'cover'; note: CatalogNoteInfo };

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
