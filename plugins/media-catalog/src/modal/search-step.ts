import { DropdownComponent, SearchComponent, debounce } from 'obsidian';
import { BOOK_SOURCES, CLS, KINDS, MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '../constants';
import { t } from '../i18n';
import { providersFor } from '../providers';
import { CatalogError, describeError } from '../providers/errors';
import type { Provider, SearchResult } from '../types';
import { renderInstructions } from '../ui/instructions';
import { OptionList } from '../ui/option-list';
import { renderResultCard } from '../ui/result-card';
import { renderEmpty, renderError, renderHint, renderLoading } from '../ui/states';
import { defaultProvider, highlightIndex, orderResults, searchPlan } from './search-state';
import type { SearchState } from './search-state';
import { isOnControl } from './steps';
import type { Step, StepHost } from './steps';

export class SearchStep implements Step {
	readonly title: string;
	private seq = 0;
	private rootEl: HTMLElement | null = null;
	private bodyEl: HTMLElement | null = null;
	private inputEl: HTMLInputElement | null = null;
	private list: OptionList<SearchResult> | null = null;
	private readonly searchSoon = debounce(() => void this.run(), SEARCH_DEBOUNCE_MS, true);

	constructor(
		private readonly host: StepHost,
		private readonly state: SearchState,
	) {
		this.title = t(host.options.mode === 'cover' ? 'modal.cover.title' : 'modal.add.title');
	}

	render(el: HTMLElement): void {
		this.rootEl = el;
		this.renderToolbar(el.createDiv({ cls: CLS.toolbar }));
		this.bodyEl = el.createDiv();
		renderInstructions(el, [
			{ command: '↑↓', purpose: t('modal.instructions.navigate') },
			{ command: '↵', purpose: t('modal.instructions.choose') },
			{ command: 'esc', purpose: t('modal.instructions.close') },
		]);
		this.paint();

		// First open in cover mode, a search cut short by leaving the step, or a
		// query typed right before leaving: search now. Results that still match
		// the query (coming back from a later step) are kept as they are.
		const { phase } = this.state;
		const settled = this.isFresh() && (phase === 'done' || phase === 'error');
		if (this.state.query.trim().length >= MIN_QUERY_LENGTH && !settled) void this.run();
	}

	focus(): void {
		this.inputEl?.focus();
	}

	onKey(evt: KeyboardEvent): boolean {
		if (isOnControl(evt)) return false;
		switch (evt.key) {
			case 'ArrowDown':
				return this.list?.move(1) ?? false;
			case 'ArrowUp':
				return this.list?.move(-1) ?? false;
			case 'Enter':
				this.enter();
				return true;
			default:
				return false;
		}
	}

	destroy(): void {
		this.searchSoon.cancel();
		this.seq++;
	}

	private renderToolbar(toolbar: HTMLElement): void {
		const { context, options } = this.host;

		const kind = new DropdownComponent(toolbar);
		for (const value of KINDS) kind.addOption(value, t(`kind.${value}`));
		kind.setValue(this.state.kind)
			.setDisabled(options.mode === 'cover')
			.onChange((value) => this.changeKind(value));
		kind.selectEl.setAttr('aria-label', t('search.kind'));

		const providers = providersFor(context.providers, this.state.kind);
		if (providers.length > 1) {
			const source = new DropdownComponent(toolbar);
			for (const provider of providers) source.addOption(provider.id, provider.name);
			source.setValue(this.state.providerId ?? '').onChange((value) => this.changeSource(value));
			source.selectEl.setAttr('aria-label', t('search.source'));
		}

		const search = new SearchComponent(toolbar.createDiv({ cls: CLS.search }))
			.setPlaceholder(t('search.placeholder'))
			.setValue(this.state.query)
			.onChange((value) => this.changeQuery(value));
		search.inputEl.setAttrs({ 'aria-label': t('search.placeholder'), 'aria-autocomplete': 'list' });
		this.inputEl = search.inputEl;
	}

	private changeKind(value: string): void {
		const kind = KINDS.find((candidate) => candidate === value);
		if (!kind || kind === this.state.kind) return;
		const { context } = this.host;
		this.state.kind = kind;
		this.state.providerId = defaultProvider(context, kind)?.id ?? null;
		this.clearResults();
		context.settings.lastKind = kind;
		context.settingsChanged();
		// The source dropdown depends on the kind: rebuild the step (render searches again).
		this.destroy();
		if (this.rootEl) {
			this.rootEl.empty();
			this.render(this.rootEl);
			this.focus();
		}
	}

	private changeSource(value: string): void {
		const { context } = this.host;
		const provider = providersFor(context.providers, this.state.kind).find((p) => p.id === value);
		if (!provider || provider.id === this.state.providerId) return;
		this.state.providerId = provider.id;
		const bookSource = BOOK_SOURCES.find((source) => source === provider.id);
		if (this.state.kind === 'book' && bookSource) {
			// Remembered like the kind: the next book search starts on this source.
			context.settings.bookSource = bookSource;
			context.settingsChanged();
		}
		this.clearResults();
		void this.run();
		this.inputEl?.focus();
	}

	private changeQuery(value: string): void {
		this.state.query = value;
		const { phase } = this.state;
		// Only spaces changed: keep the results (or the search in flight) and the highlight.
		if (this.isFresh() && (phase === 'loading' || phase === 'done')) {
			this.searchSoon.cancel();
			return;
		}
		if (value.trim().length >= MIN_QUERY_LENGTH) {
			this.searchSoon();
			return;
		}
		this.searchSoon.cancel();
		this.seq++;
		this.clearResults();
		this.paint();
	}

	/** Enter: search now when the query changed or failed; otherwise pick the highlighted result. */
	private enter(): void {
		if (this.isFresh()) {
			if (this.state.phase === 'loading') return;
			if (this.state.phase === 'done') {
				this.list?.pick();
				return;
			}
		}
		void this.run();
	}

	private async run(): Promise<void> {
		this.searchSoon.cancel();
		const provider = this.provider();
		const query = this.state.query.trim();
		const seq = ++this.seq;
		if (!provider || query.length < MIN_QUERY_LENGTH) {
			this.clearResults();
			this.paint();
			return;
		}

		const { kind } = this.state;
		const plan = searchPlan(this.host.options, query);
		this.state.phase = 'loading';
		this.state.searched = { kind, providerId: provider.id, query };
		this.state.results = [];
		this.state.selected = -1;
		this.paint();
		try {
			const results = orderResults(await provider.search(plan.text, kind), plan);
			if (seq !== this.seq) return;
			this.state.results = results;
			this.state.selected = highlightIndex(results, plan);
			this.state.phase = 'done';
		} catch (error) {
			if (seq !== this.seq) return;
			if (!(error instanceof CatalogError)) console.error('Media Catalog: search failed', error);
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
		const source = this.provider()?.name ?? '';
		const { phase, results } = this.state;

		if (phase === 'loading') {
			renderLoading(body, t('search.loading', { source }));
		} else if (phase === 'error') {
			renderError(body, describeError(this.state.error, source), () => {
				void this.run();
				this.inputEl?.focus();
			});
		} else if (phase === 'done' && results.length === 0) {
			renderEmpty(body, t('search.empty', { query: this.state.searched?.query ?? '', source }));
		} else if (phase === 'done') {
			this.list = new OptionList(body, {
				items: results,
				selected: this.state.selected,
				label: t('search.results'),
				render: (result, el) => renderResultCard(el, result, source),
				onSelect: (index) => {
					this.state.selected = index;
					this.syncActive();
				},
				onPick: (index) => this.choose(index),
			});
		} else {
			renderHint(body, t('search.hint', { min: MIN_QUERY_LENGTH }));
		}
		this.syncActive();
	}

	private choose(index: number): void {
		const result = this.state.results[index];
		const provider = this.provider();
		if (result && provider) this.host.chooseResult(result, provider);
	}

	/** The input keeps the focus; screen readers follow the highlighted option through it. */
	private syncActive(): void {
		const input = this.inputEl;
		if (!input) return;
		const list = this.list;
		const active = list?.activeId ?? null;
		if (list && active) {
			input.setAttrs({ 'aria-controls': list.el.id, 'aria-activedescendant': active });
		} else {
			input.removeAttribute('aria-controls');
			input.removeAttribute('aria-activedescendant');
		}
	}

	private clearResults(): void {
		this.state.phase = 'idle';
		this.state.searched = null;
		this.state.results = [];
		this.state.selected = -1;
		this.state.error = null;
	}

	private isFresh(): boolean {
		const { searched } = this.state;
		return (
			searched !== null &&
			searched.kind === this.state.kind &&
			searched.providerId === this.state.providerId &&
			searched.query === this.state.query.trim()
		);
	}

	private provider(): Provider | undefined {
		const providers = providersFor(this.host.context.providers, this.state.kind);
		return providers.find((provider) => provider.id === this.state.providerId) ?? providers[0];
	}
}
