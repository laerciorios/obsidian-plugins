import { ButtonComponent } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';
import { CatalogError, describeError } from '../providers/errors';
import type { SearchResult, SeasonInfo, SeasonProvider } from '../types';
import { renderInstructions } from '../ui/instructions';
import { OptionList } from '../ui/option-list';
import { renderSeasonTile } from '../ui/result-card';
import { renderEmpty, renderError, renderLoading } from '../ui/states';
import { isOnControl } from './steps';
import type { Step, StepHost } from './steps';

/** Seasons of one series, kept by the modal so coming back from confirm does not reload them. */
export interface SeasonState {
	key: string;
	phase: 'loading' | 'done' | 'error';
	seasons: SeasonInfo[];
	selected: number;
	error: unknown;
}

export function seasonKey(result: SearchResult, provider: SeasonProvider): string {
	return `${provider.id}:${result.externalId}`;
}

export function createSeasonState(result: SearchResult, provider: SeasonProvider): SeasonState {
	return { key: seasonKey(result, provider), phase: 'loading', seasons: [], selected: -1, error: null };
}

export interface SeasonChoice {
	result: SearchResult;
	provider: SeasonProvider;
}

export class SeasonStep implements Step {
	readonly title = t('modal.season.title');
	private seq = 0;
	private bodyEl: HTMLElement | null = null;
	private list: OptionList<SeasonInfo> | null = null;

	/** @param preselect Season number to highlight once loaded (cover mode: the note's season). */
	constructor(
		private readonly host: StepHost,
		private readonly choice: SeasonChoice,
		private readonly state: SeasonState,
		private readonly preselect: number | null,
	) {}

	render(el: HTMLElement): void {
		const { result } = this.choice;
		const heading = result.year === undefined ? result.title : `${result.title} (${result.year})`;
		el.createDiv({ cls: CLS.hint, text: heading });
		this.bodyEl = el.createDiv();

		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		renderInstructions(el, [
			{ command: '↑↓←→', purpose: t('modal.instructions.navigate') },
			{ command: '↵', purpose: t('modal.instructions.choose') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);

		if (this.state.phase === 'loading') void this.load();
		else this.paint();
	}

	/** The grid, once loaded: screen readers announce the highlighted season through it. */
	focus(): void {
		this.list?.el.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		const list = this.list;
		if (!list || isOnControl(evt)) return false;
		switch (evt.key) {
			case 'ArrowLeft':
				return list.move(-1);
			case 'ArrowRight':
				return list.move(1);
			case 'ArrowUp':
				return list.moveRow(-1);
			case 'ArrowDown':
				return list.moveRow(1);
			case 'Enter':
				return list.pick();
			default:
				return false;
		}
	}

	destroy(): void {
		this.seq++;
	}

	private async load(): Promise<void> {
		const seq = ++this.seq;
		this.state.phase = 'loading';
		this.paint();
		try {
			const seasons = await this.choice.provider.seasons(this.choice.result);
			if (seq !== this.seq) return;
			const wanted = this.preselect === null ? -1 : seasons.findIndex((season) => season.number === this.preselect);
			this.state.seasons = seasons;
			this.state.selected = seasons.length > 0 ? Math.max(wanted, 0) : -1;
			this.state.phase = 'done';
		} catch (error) {
			if (seq !== this.seq) return;
			if (!(error instanceof CatalogError)) console.error('Media Catalog: loading seasons failed', error);
			this.state.phase = 'error';
			this.state.error = error;
		}
		this.paint();
	}

	private paint(): void {
		const body = this.bodyEl;
		if (!body) return;
		body.empty();
		this.list = null;
		const { phase, seasons } = this.state;

		if (phase === 'loading') {
			renderLoading(body, t('season.loading'));
		} else if (phase === 'error') {
			renderError(body, describeError(this.state.error, this.choice.provider.name), () => void this.load());
		} else if (seasons.length === 0) {
			renderEmpty(body, t('season.empty'));
		} else {
			this.list = new OptionList(body, {
				items: seasons,
				selected: this.state.selected,
				label: this.title,
				layout: 'grid',
				render: (season, el) => renderSeasonTile(el, season),
				onSelect: (index) => {
					this.state.selected = index;
				},
				onPick: (index) => {
					const season = seasons[index];
					if (season) this.host.chooseSeason(season);
				},
			});
			this.list.el.setAttr('tabindex', '0');
			// Seasons that arrive after the step is on screen take the focus too.
			this.focus();
		}
	}
}
