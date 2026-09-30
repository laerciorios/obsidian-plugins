import { ButtonComponent } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import type { SearchResult } from '../types';
import { renderInstructions } from '../ui/instructions';
import { renderPreview } from '../ui/preview';
import { renderLoading } from '../ui/states';
import type { Chosen, Step, StepHost } from './steps';

/**
 * Between the pick and the next step, for sources that finish a result once
 * it is picked (Provider.resolve: MusicBrainz checks the Cover Art Archive,
 * then iTunes). Shows the chosen item and a loading state; Back returns to the
 * search. Leaving the step or closing the modal drops the answer.
 */
export class ResolveStep implements Step {
	readonly title: string;
	private active = true;

	constructor(
		private readonly host: StepHost,
		private readonly chosen: Chosen,
		private readonly onResolved: (result: SearchResult) => void,
	) {
		this.title = t(host.options.mode === 'cover' ? 'modal.cover.title' : 'modal.confirm.title');
	}

	render(el: HTMLElement): void {
		const { result, provider } = this.chosen;
		// The thumbnail the result list already loaded: the full cover is what is being checked.
		renderPreview(el, result, provider.name, null, { cover: result.thumbUrl ?? result.coverUrl ?? null });
		renderLoading(el, t('resolve.loading'));
		const actions = el.createDiv({ cls: ['modal-button-container', CLS.actions] });
		new ButtonComponent(actions).setButtonText(t('modal.back')).onClick(() => this.host.back());
		renderInstructions(el, [{ command: 'esc', purpose: t('modal.instructions.close') }]);
		void this.run();
	}

	destroy(): void {
		this.active = false;
	}

	private async run(): Promise<void> {
		const { result, provider } = this.chosen;
		let resolved = result;
		try {
			if (provider.resolve) resolved = await provider.resolve(result);
		} catch (error) {
			// resolve() should not throw: go on with the result as the search found it.
			if (!(error instanceof CatalogError)) console.error('Media Catalog: could not complete the result', error);
		}
		if (this.active) this.onResolved(resolved);
	}
}
