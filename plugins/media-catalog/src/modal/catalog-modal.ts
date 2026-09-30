import { Modal } from 'obsidian';
import { CLS } from '../constants';
import { hasSeasons } from '../providers';
import type { CatalogContext, Provider, SearchResult, SeasonInfo } from '../types';
import { ConfirmStep } from './confirm-step';
import { CoverStep } from './cover-step';
import { ResolveStep } from './resolve-step';
import { createSearchState } from './search-state';
import type { SearchState } from './search-state';
import { SearchStep } from './search-step';
import { SeasonStep, createSeasonState, seasonKey } from './season-step';
import type { SeasonState } from './season-step';
import type { CatalogModalOptions, Chosen, Step, StepHost } from './steps';

export type { CatalogModalOptions } from './steps';

const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'] as const;

/**
 * One modal, a few steps: search → (resolve, for sources that finish a result
 * once picked) → season (series only) → confirm. The state that must survive
 * going back (query, results, selection, seasons, resolved results) lives
 * here; each step only draws it. Keys reach the step on screen through the
 * modal scope. Closing destroys the step, which cancels its timers and makes
 * pending responses stale.
 */
export class CatalogModal extends Modal {
	private readonly host: StepHost;
	private readonly searchState: SearchState;
	private seasonState: SeasonState | null = null;
	/** Results already resolved, by `<provider>:<externalId>`: picking one again after Back does not repeat the requests. */
	private readonly resolved = new Map<string, SearchResult>();
	private chosen: Chosen | null = null;
	private step: Step | null = null;
	private atConfirm = false;

	constructor(
		context: CatalogContext,
		private readonly launch: CatalogModalOptions,
	) {
		super(context.app);
		this.searchState = createSearchState(context, launch);
		this.host = {
			context,
			options: launch,
			chooseResult: (result, provider) => this.chooseResult(result, provider),
			chooseSeason: (season) => this.showConfirm(season),
			back: () => this.back(),
			close: () => this.close(),
		};

		// Returning false marks the key as handled (Obsidian prevents the default).
		for (const key of NAV_KEYS) this.scope.register([], key, (evt) => !this.dispatch(evt));
		// Always swallowed: Mod+Enter is also the default hotkey of "Toggle checkbox status".
		this.scope.register(['Mod'], 'Enter', (evt) => {
			this.dispatch(evt);
			return false;
		});
	}

	onOpen(): void {
		this.modalEl.addClass(CLS.modal);
		this.showSearch();
	}

	open(): void {
		super.open();
		// Modal.open() focuses the first focusable element after onOpen (the kind
		// dropdown, where typing would change the kind): hand the focus back to the step.
		this.step?.focus?.();
	}

	onClose(): void {
		this.step?.destroy?.();
		this.step = null;
		this.contentEl.empty();
	}

	private dispatch(evt: KeyboardEvent): boolean {
		if (evt.isComposing) return false;
		return this.step?.onKey?.(evt) ?? false;
	}

	private show(step: Step): void {
		this.step?.destroy?.();
		this.step = step;
		this.contentEl.empty();
		this.setTitle(step.title);
		step.render(this.contentEl);
		step.focus?.();
	}

	private showSearch(): void {
		this.atConfirm = false;
		this.show(new SearchStep(this.host, this.searchState));
	}

	/** A result was picked: resolve it first when its source can, then seasons or confirm. */
	private chooseResult(result: SearchResult, provider: Provider): void {
		const key = `${provider.id}:${result.externalId}`;
		const known = this.resolved.get(key);
		if (known || !provider.resolve) {
			this.proceed({ result: known ?? result, provider });
			return;
		}
		this.atConfirm = false;
		this.show(
			new ResolveStep(this.host, { result, provider }, (resolved) => {
				this.resolved.set(key, resolved);
				this.proceed({ result: resolved, provider });
			}),
		);
	}

	private proceed(chosen: Chosen): void {
		this.chosen = chosen;
		if (this.hasSeasonStep()) this.showSeason();
		else this.showConfirm(null);
	}

	private hasSeasonStep(): boolean {
		return this.chosen !== null && this.chosen.result.kind === 'series' && hasSeasons(this.chosen.provider);
	}

	private showSeason(): void {
		const chosen = this.chosen;
		if (!chosen || !hasSeasons(chosen.provider)) return;
		const { result, provider } = chosen;
		const kept = this.seasonState;
		const state = kept && kept.key === seasonKey(result, provider) ? kept : createSeasonState(result, provider);
		this.seasonState = state;
		const preselect = this.launch.mode === 'cover' ? this.launch.note.season : null;
		this.atConfirm = false;
		this.show(new SeasonStep(this.host, { result, provider }, state, preselect));
	}

	private showConfirm(season: SeasonInfo | null): void {
		const chosen = this.chosen;
		if (!chosen) return;
		const input = { result: chosen.result, provider: chosen.provider, season };
		const { launch } = this;
		this.atConfirm = true;
		this.show(launch.mode === 'cover' ? new CoverStep(this.host, launch.note, input) : new ConfirmStep(this.host, input));
	}

	private back(): void {
		if (this.atConfirm && this.hasSeasonStep()) this.showSeason();
		else this.showSearch();
	}
}
